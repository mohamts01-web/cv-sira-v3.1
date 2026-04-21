# خطة إصلاح مشكلة tenant_id المفقودة

## المشكلة الحالية

### الأعراض
1. **خطأ في الحفظ التلقائي**: جميع عمليات الحفظ تفشل برسالة:
   ```
   Tenant ID not found in user metadata
   ```

2. **خطأ في السياسات الأمان (RLS)**:
   - سياسات RLS في جدول `projects` تتطلب `tenant_id` من بيانات المستخدم
   - بيانات المستخدم الحالية لا تحتوي على حقل `tenant_id`
   - هذا يمنع المستخدمين من حفظ أي مشاريع

### السبب الجذري

**تدفق البيانات المكسور**:
```
┌─────────────────────────────────────────────────────┐
│  Authentication Flow (Current)               │
│  ────────────────────────────────────────────  │
│  1. User signs up/logs in              │
│ 2. Auth Context creates user session        │
│ 3. upsertProfile() is called              │
│    - Sets: name, email, role, plan_name  │
│    - MISSING: tenant_id                  │
│ 4. User tries to save project            │
│ 5. saveProject() requires tenant_id          │
│ 6. Error: "Tenant ID not found"          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Database RLS Policies (Current)          │
│  ────────────────────────────────────────────  │
│  Policy: "Users can insert own tenant     │
│   projects"                                │
│  ────────────────────────────────────────────  │
│   USING (tenant_id = (SELECT              │
│     raw_user_meta_data->>'tenant_id'        │
│     FROM auth.users WHERE id = auth.uid())) │
│  ────────────────────────────────────────────  │
└─────────────────────────────────────────────────────┘
```

## الحل المقترح

### 1. تحديث نظام التوثيق (Authentication)

#### التغييرات المطلوبة

**في [`frontend/lib/auth-context.tsx`](frontend/lib/auth-context.tsx):**

```typescript
// إضافة حقل tenant_id إلى دالة upsertProfile
async function upsertProfile(supabaseUser: SupabaseUser): Promise<User> {
  const meta = supabaseUser.user_metadata || {}

  // إضافة tenant_id افتراضي إذا لم يكن موجود
  if (!meta.tenant_id) {
    meta.tenant_id = 'default' // أو يمكن توليد UUID فريد
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", supabaseUser.id)
    .single()

  if (existing) {
    return {
      id: existing.id,
      name: existing.name || meta.name || "",
      email: supabaseUser.email || "",
      role: existing.role || "user",
      plan_name: existing.plan_name || "Free",
      points: existing.points ?? 5,
      // تأكد من وجود tenant_id
      tenant_id: existing.tenant_id || meta.tenant_id || 'default',
    }
  }

  const { error } = await supabase.from("profiles").insert({
    id: supabaseUser.id,
    name: meta.name || "",
    email: supabaseUser.email || "",
    role: "user",
    plan_name: "Free",
    points: 5,
    tenant_id: meta.tenant_id || 'default', // ← إضافة هذا الحقل
  })
  if (error) console.error("Profile insert error:", error.message)

  return {
    ...newProfile,
    email: supabaseUser.email || "",
  }
}
```

#### التوضيح

- **قيمة افتراضية**: إذا لم يكن `tenant_id` في بيانات المستخدم، نستخدم `'default'` كقيمة افتراضية
- **UUID فريد**: يمكن استخدام UUID فريد بدلاً من `'default'` لضمان التفرق
- **الحفاظ على البيانات الموجودة**: إذا كان المستخدم لديه `tenant_id`، نحافظ عليه

### 2. تحديث سياسات RLS (قواعد البيانات)

#### المشكلة

سياسات RLS الحالية تفترض أن `tenant_id` موجود دائماً في بيانات المستخدم، مما يسبب فشل للمستخدمين الجدد الذين ليس لديهم هذا الحقل.

#### الحل المقترح

**خيار أ: تعديل السياسات لتكون أكثر تساهلاً (موصى به)**

```sql
-- تحديث سياسة INSERT للسماح بحفظ حتى بدون tenant_id
CREATE POLICY "Users can insert own tenant projects (relaxed)"
ON public.projects FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- إما tenant_id موجود في بيانات المستخدم أو نستخدم قيمة افتراضية
    (tenant_id = (
      SELECT raw_user_meta_data->>'tenant_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) OR tenant_id = 'default'
  )
);

-- تحديث سياسة UPDATE
CREATE POLICY "Users can update own tenant projects (relaxed)"
ON public.projects FOR UPDATE
WITH CHECK (
  user_id = auth.uid()
  AND (
    tenant_id = (
      SELECT raw_user_meta_data->>'tenant_id' 
      FROM auth.users 
      WHERE id = auth.uid()
    ) OR tenant_id = 'default'
  )
);
```

**خيار ب: إضافة دالة مساعدة في قاعدة البيانات**

```sql
-- دالة للحصول على tenant_id مع قيمة افتراضية
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_id UUID) 
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    raw_user_meta_data->>'tenant_id',
    'default'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث سياسات لاستخدام الدالة
CREATE POLICY "Users can insert own tenant projects (with helper)"
ON public.projects FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id = get_user_tenant_id(auth.uid())
);

CREATE POLICY "Users can update own tenant projects (with helper)"
ON public.projects FOR UPDATE
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id = get_user_tenant_id(auth.uid())
);
```

### 3. تحديث نظام الحفظ التلقائي

#### التغييرات المطلوبة

**في [`frontend/hooks/use-save-project.ts`](frontend/hooks/use-save-project.ts):**

```typescript
// تحديث الدالة saveProject للتعامل مع tenant_id المفقود
export async function saveProject(params: {
  serviceType: ServiceType
  title?: string
  data: Record<string, unknown>
  thumbnail?: string
}): Promise<Project> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("User must be authenticated")

  let { data: { session: currentSession } } = await supabase.auth.getSession()
  if (!currentSession) throw new Error("User must be authenticated")

  const userId = currentSession.user.id
  const tenantId = currentSession.user.user_metadata?.tenant_id || 'default' // ← استخدام قيمة افتراضية

  if (!tenantId) {
    console.warn('[saveProject] Tenant ID not found, using default')
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      tenant_id: tenantId, // ← استخدام tenant_id (موجود أو افتراضي)
      service_type: params.serviceType,
      title: params.title || getDefaultTitle(params.serviceType),
      data: params.data,
      thumbnail: params.thumbnail || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save project: ${error.message}`)
  return data as Project
}
```

**في [`frontend/hooks/use-auto-save.ts`](frontend/hooks/use-auto-save.ts):**

```typescript
// تحسين معالجة الأخطاء
} catch (error) {
  console.error('[Auto-Save] Failed:', error)
  console.error('[Auto-Save] Error details:', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    dataKeys: Object.keys(data),
    enabled,
    tenantId: currentSession?.user?.user_metadata?.tenant_id || 'default', // ← تسجيل tenant_id للتصحيح
  })

  // إظهار رسالة خطأ أكثر وضوحاً للمستخدم
  toast({
    title: "فشل الحفظ",
    description: error instanceof Error 
      ? error.message 
      : "حدث خطأ أثناء الحفظ. يرجى المحاولة مرة أخرى.",
    variant: "destructive",
  })
}
```

### 4. ترحيل البيانات (Migration)

#### ترحيل للمستخدمين الموجودين

```sql
-- ترحيل: إضافة tenant_id افتراضي للمستخدمين الموجودين
-- ملاحظة: هذا يجب تشغيل مرة واحدة ثم حذفه

-- 1. إضافة عمود tenant_id افتراضي
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'default';

-- 2. تحديث المستخدمين الموجودين
UPDATE auth.users 
SET tenant_id = 'default'
WHERE tenant_id IS NULL;

-- 3. إضافة قيد NOT NULL بعد الترحيل
ALTER TABLE auth.users 
ALTER COLUMN tenant_id SET NOT NULL;
```

#### ترحيل للمشاريع الموجودة

```sql
-- ترحيل: تحديث المشاريع التي تم حفظها بدون tenant_id
-- ملاحظة: هذا اختياري إذا كنت تفضل حذفها

UPDATE public.projects
SET tenant_id = 'default'
WHERE tenant_id IS NULL;
```

### 5. خطة التنفيذ

#### المرحلة 1: إصلاح التوثيق (فوري)
1. تحديث [`frontend/lib/auth-context.tsx`](frontend/lib/auth-context.tsx) لإضافة `tenant_id`
2. تحديث [`frontend/hooks/use-save-project.ts`](frontend/hooks/use-save-project.ts) لاستخدام `tenant_id` مع قيمة افتراضية
3. اختبار الحفظ التلقائي للتأكد من العمل

#### المرحلة 2: تحديث قواعد البيانات (اختياري)
1. إنشاء ملف ترحيل جديد: [`supabase/migrations/20260421_fix_tenant_id.sql`](supabase/migrations/20260421_fix_tenant_id.sql)
2. تطبيق الترحيل على المستخدمين الموجودين
3. تطبيق الترحيل على المشاريع الموجودة
4. تحديث سياسات RLS لتكون أكثر تساهلاً

#### المرحلة 3: اختبار شامل
1. اختبار تسجيل مستخدم جديد
2. اختبار الحفظ التلقائي
3. اختبار الحفظ اليدوي
4. التحقق من ظهور المشاريع في قسم المشاريع

### 6. الميزات الإضافية المقترحة

بعد إصلاح المشكلة الأساسية، يمكن إضافة:

1. **دعم متعدد المستأجرين**:
   - إضافة حقل `organization_id` في بيانات المستخدم
   - السماح للمستخدم بالتبديل بين المنظمات

2. **إدارة أفضل للمشاريع**:
   - إضافة إمكانية تسمية/إعادة تسمية المشاريع
   - إضافة نسخ متعددة من المشروع
   - إضافة أرشفة للمشاريع المحذوفة

3. **تحسينات على الحفظ التلقائي**:
   - حفظ تلقائي أثناء التفاعل (بدون تأخير)
   - حفظ نسخ متعددة تلقائياً
   - إشعار عند فقدان التغييرات غير المحفوظة

### 7. مخاطر وتخفيفات

#### مخاطر
1. **فقدان البيانات**: إذا تم حذف المشاريع بدون tenant_id، يمكن فقدان البيانات
2. **مشاكلات التوافق**: المستخدمون الجدد الذين لديهم tenant_id قد يواجهون مشاكل مع المستخدمين القدامين

#### التخفيفات
1. **الترحيل التدريجي**: تنفيذ الترحيل على دفعات مع مراقبة دقيقة
2. **الاختبار الشامل**: اختبار جميع السيناريوهات قبل النشر
3. **النسخ الاحتياطي**: أخذ نسخة احتياطية من قاعدة البيانات قبل الترحيل
4. **التراجع**: إمكانية التراجع عن الترحيل وإعادته

### 8. ملخص التغييرات

| المكون | التغيير | السبب |
|---------|---------|--------|
| `auth-context.tsx` | إضافة `tenant_id` إلى `upsertProfile()` | حل مشكلة التوثيق |
| `use-save-project.ts` | استخدام `tenant_id` مع قيمة افتراضية `'default'` | التعامل مع المستخدمين الجدد |
| `use-auto-save.ts` | تحسين معالجة الأخطاء | تجربة مستخدم أفضل |
| RLS Policies | تحديث لتكون أكثر تساهلاً | السماح بالحفظ بدون tenant_id |
| Database | إضافة `tenant_id` افتراضي للمستخدمين الموجودين | الترحيل التدريجي |

---

**تاريخ الإنشاء**: 2026-04-21  
**الحالة**: مسودة للمراجعة  
**الأولوية**: عالية - حاسمة للمستخدمين
