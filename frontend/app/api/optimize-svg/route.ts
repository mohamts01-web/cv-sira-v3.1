import { optimize } from "svgo"

export async function POST(req: Request) {
  const { svg } = await req.json()

  if (!svg) {
    return Response.json({ error: "SVG content is required" }, { status: 400 })
  }

  try {
    const originalSize = new Blob([svg]).size
    const result = optimize(svg, {
      plugins: [
        "removeDoctype",
        "removeXMLProcInst",
        "removeComments",
        "removeMetadata",
        "removeEditorsNSData",
        "cleanupAttrs",
        "mergeStyles",
        "inlineStyles",
        "minifyStyles",
        "cleanupIds",
        "removeUselessDefs",
        "cleanupNumericValues",
        "convertColors",
        "removeUnknownsAndDefaults",
        "removeNonInheritableGroupAttrs",
        "removeUselessStrokeAndFill",
        "removeViewBox",
        "cleanupEnableBackground",
        "removeHiddenElems",
        "removeEmptyText",
        "convertShapeToPath",
        "convertEllipseToCircle",
        "moveElemsAttrsToGroup",
        "moveGroupAttrsToElems",
        "collapseGroups",
        "removeRasterImages",
        "mergePaths",
        "convertTransform",
        "removeEmptyAttrs",
        "removeEmptyContainers",
        "removeUnusedNS",
        "sortDefsChildren",
        "removeTitle",
        "removeDesc",
      ],
    })

    const optimizedSize = new Blob([result.data]).size
    const percent = Math.round(((originalSize - optimizedSize) / originalSize) * 100)

    return Response.json({
      svg: result.data,
      originalSize,
      optimizedSize,
      percent,
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Optimization failed" },
      { status: 500 },
    )
  }
}
