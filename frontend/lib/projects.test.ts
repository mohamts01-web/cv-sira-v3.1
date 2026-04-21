import { saveProject } from "./projects"

// Mock Supabase
jest.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: "user-123", user_metadata: { tenant_id: "tenant-456" } },
            access_token: "mock-token"
          }
        }
      })
    },
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { id: "project-1" }, error: null })
  }
}))

// Mock upload
jest.mock("./upload", () => ({
  uploadDataUrl: jest.fn().mockResolvedValue({ url: "https://r2-url.com/image.png" })
}))

describe("saveProject with R2 integration", () => {
  it("should upload thumbnail to R2 if it is a data URL", async () => {
    const { uploadDataUrl } = require("./upload")
    
    await saveProject({
      serviceType: "badge-generator",
      title: "Test Project",
      data: {},
      thumbnail: "data:image/png;base64,mockdata"
    })

    expect(uploadDataUrl).toHaveBeenCalledWith(
      "data:image/png;base64,mockdata",
      "user-123",
      "tenant-456",
      expect.anything()
    )
  })
})
