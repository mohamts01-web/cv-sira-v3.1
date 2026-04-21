# دليل الحفظ التلقائي للمشاريع

## نظرة عامة

تم تنفيذ ميزة الحفظ التلقائي (Auto-Save) لجميع خدمات المنصة. هذه الميزة تقوم بحفظ أي تفاعل يقوم به المستخدم تلقائياً كمسودة في قسم المشاريع، مما يضمن عدم فقدان العمل.

## الميزات الرئيسية

### 1. الحفظ التلقائي
- يتم حفظ العمل تلقائياً بعد 3 ثوانٍ من عدم التفاعل
- يتم حفظ جميع إعدادات الخدمة الحالية
- يتم حفظ العمل كمسودة مع طابع زمني
- يمكن تفعيل/تعطيل الحفظ التلقائي من خلال زر في الواجهة

### 2. الحفظ اليدوي
- زر "حفظ" لحفظ المشروع باسم مخصص
- يتم حفظ المشروع في قسم المشاريع
- يمكن الوصول إلى المشاريع المحفوظة من لوحة التحكم

### 3. مؤشر الحالة
- يظهر مؤشر مرئي لحالة الحفظ التلقائي
- يعرض "جارٍ الحفظ..." أثناء الحفظ
- يعرض "تم الحفظ: HH:MM" عند اكتمال الحفظ

## الخدمات المدعومة

الخدمات التالية تدعم الحفظ التلقائي:

1. **مولّد الشارات** (Badge Generator)
   - حفظ تلقائي للإعدادات والصور المولّدة
   - حفظ إعدادات الماتريكس وتأثيرات الصور

2. **مولّد البطاقات** (Card Generator)
   - حفظ تلقائي لتصميم البطاقات
   - حفظ جميع العناصر والنصوص

3. **مولّد SVG** (SVG Generator)
   - حفظ تلقائي لتصاميم SVG
   - حفظ جميع المعاملات والألوان

4. **مولّد نماذج المنتجات** (Mockup Generator)
   - حفظ تلقائي للنماذج
   - حفظ جميع الإعدادات والصور

5. **محول ASCII Art** (ASCII Converter)
   - حفظ تلقائي للتحويلات
   - حفظ الإعدادات والنتائج

6. **مولّد الإنفوجرافيك** (Infographic Generator)
   - حفظ تلقائي للإنفوجرافيك
   - حفظ جميع العناصر والتصميم

7. **محرر الإنفوجرافيك** (Infographic Editor)
   - حفظ تلقائي لتعديلات الإنفوجرافيك
   - حفظ جميع الطبقات والعناصر

## كيفية الاستخدام

### للمستخدمين النهائيين

1. **التفاعل مع الخدمة**
   - قم بأي تعديلات أو تفاعلات مع الخدمة
   - سيتم حفظ العمل تلقائياً بعد 3 ثوانٍ من عدم التفاعل

2. **تفعيل/تعطيل الحفظ التلقائي**
   - اضغط على زر "حفظ تلقائي" لتبديل الحالة
   - الزر باللون الأخضر يعني الحفظ التلقائي مفعّل
   - الزر باللون الرمادي يعني الحفظ التلقائي معطّل

3. **الحفظ اليدوي باسم مخصص**
   - اضغط على زر "حفظ"
   - سيتم حفظ المشروع بالاسم المخصص
   - سيظهر المشروع في قسم المشاريع

4. **الوصول إلى المشاريع المحفوظة**
   - انتقل إلى قسم المشاريع في لوحة التحكم
   - ستجد جميع المشاريع المحفوظة هناك
   - يمكنك فتح أي مشروع للتعديل عليه

### للمطورين

#### تطبيق الحفظ التلقائي في خدمة جديدة

1. **استيراد الـ Hook**
   ```typescript
   import { useAutoSave } from "@/hooks/use-auto-save"
   ```

2. **جمع بيانات الخدمة**
   ```typescript
   const serviceData = useMemo(() => ({
     // جميع متغيرات الحالة الخاصة بالخدمة
     variable1, variable2, variable3,
   }), [variable1, variable2, variable3])
   ```

3. **استخدام الـ Hook**
   ```typescript
   const { isSaving, lastSaved, manualSave } = useAutoSave({
     serviceType: "service-type",
     data: serviceData,
     thumbnail: thumbnailUrl,
     enabled: autoSaveEnabled,
     delay: 3000, // 3 ثوانٍ
   })
   ```

4. **إضافة واجهة المستخدم**
   - زر تفعيل/تعطيل الحفظ التلقائي
   - زر الحفظ اليدوي
   - مؤشر حالة الحفظ

#### مثال كامل

```typescript
"use client"

import { useState, useMemo } from "react"
import { useAutoSave } from "@/hooks/use-auto-save"
import { Save, Settings, Loader2 } from "lucide-react"

export default function ServicePage() {
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  
  // جمع بيانات الخدمة
  const serviceData = useMemo(() => ({
    setting1, setting2, setting3,
  }), [setting1, setting2, setting3])
  
  // استخدام الحفظ التلقائي
  const { isSaving, lastSaved, manualSave } = useAutoSave({
    serviceType: "service-type",
    data: serviceData,
    thumbnail: thumbnailUrl,
    enabled: autoSaveEnabled,
    delay: 3000,
  })
  
  return (
    <div>
      {/* زر تفعيل/تعطيل الحفظ التلقائي */}
      <button
        onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
        className={`... ${autoSaveEnabled ? 'active' : ''}`}
      >
        <Settings className="h-4 w-4" />
        <span>حفظ تلقائي</span>
      </button>
      
      {/* زر الحفظ اليدوي */}
      <button
        onClick={() => manualSave("اسم المشروع")}
        disabled={!thumbnailUrl || isSaving}
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span>حفظ</span>
      </button>
      
      {/* مؤشر حالة الحفظ */}
      {lastSaved && autoSaveEnabled && (
        <div className="flex items-center gap-2">
          <Loader2 className={`h-3 w-3 ${isSaving ? 'animate-spin' : ''}`} />
          <span>
            {isSaving ? 'جارٍ الحفظ...' : `تم الحفظ: ${new Date(lastSaved.updated_at).toLocaleTimeString('ar-SA')}`}
          </span>
        </div>
      )}
    </div>
  )
}
```

## قاعدة البيانات

يتم حفظ المشاريع في جدول `projects` في قاعدة بيانات Supabase:

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  title TEXT NOT NULL,
  data JSONB NOT NULL,
  thumbnail TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### أنواع الخدمات

```typescript
type ServiceType =
  | "badge-generator"
  | "card-generator"
  | "svg-generator"
  | "mockup-generator"
  | "ascii-converter"
  | "infographic"
  | "infographic-editor"
```

## الأمان والخصوصية

### سياسات الأمان
- يتم حفظ المشاريع فقط للمستخدم الحالي
- لا يمكن للمستخدمين الآخرين الوصول إلى مشاريعك
- يتم تطبيق Row Level Security (RLS) في قاعدة البيانات

### خصوصية البيانات
- جميع بيانات المشروع محفوظة بشكل آمن
- يتم تشفير الاتصالات مع Supabase
- لا يتم مشاركة البيانات مع طرف ثالث

## استكشاف الأخطاء وحلها

### المشاكل الشائعة

1. **الحفظ التلقائي لا يعمل**
   - تأكد من تسجيل الدخول
   - تحقق من تفعيل الحفظ التلقائي
   - راجع سجلات المتصفح للأخطاء

2. **المشروع لا يظهر في قسم المشاريع**
   - تأكد من نجاح الحفظ
   - انتظر بضع ثوانٍ حتى يتم تحديث القائمة
   - أعد تحميل الصفحة

3. **فقدان البيانات**
   - يتم حفظ البيانات تلقائياً لتجنب الفقدان
   - إذا تم إغلاق الصفحة عن طريق الخطأ، قد تفقد آخر تغييرات
   - يُنصح دائمًا بحفظ المشروع يدويًا قبل إغلاق الصفحة

## المميزات المستقبلية

### المميزات المخطط لها

1. **الحفظ التلقائي المتقدم**
   - حفظ تلقائي أثناء التفاعل (بدون تأخير)
   - حفظ نسخ متعددة من المشروع

2. **استعادة الإصدارات السابقة**
   - عرض تاريخ التغييرات
   - إمكانية العودة إلى إصدار سابق

3. **المشاركة والتعاون**
   - مشاركة المشاريع مع مستخدمين آخرين
   - التعاون المباشر على نفس المشروع

4. **التصدير والاستيراد**
   - تصدير المشروع كملف
   - استيراد مشروع من ملف

## الدعم الفني

إذا واجهت أي مشاكل تقنية، يرجى:

1. التحقق من سجلات المتصفح للأخطاء
2. التأكد من اتصال الإنترنت
3. محاولة إعادة تحميل الصفحة
4. التواصل مع فريق الدعم

---

**آخر تحديث**: 2026-04-21  
**الإصدار**: 1.0.0  
**الحالة**: نشط
