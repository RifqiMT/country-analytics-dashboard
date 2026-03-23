import { toPng } from "html-to-image";
import { downloadDataUrlAsFile } from "./csv";

export async function exportElementToHighResPng(
  node: HTMLElement,
  filename: string,
  opts?: { pixelRatio?: number; backgroundColor?: string }
): Promise<void> {
  const pixelRatio = opts?.pixelRatio ?? 4;
  const backgroundColor = opts?.backgroundColor ?? "#ffffff";

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor,
  });

  downloadDataUrlAsFile(dataUrl, filename, "PNG");
}

