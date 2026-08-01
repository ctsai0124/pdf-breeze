"use client";

import { useMemo, useState } from "react";
import { degrees, PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Tool = "merge" | "extract" | "rotate" | "compress" | "organize" | "number" | "pdfToJpg" | "imageToPdf";

const tools: Array<{ id: Tool; number: string; title: string; note: string }> = [
  { id: "merge", number: "01", title: "合併 PDF", note: "把多份文件依序合成一份" },
  { id: "extract", number: "02", title: "擷取頁面", note: "挑出需要的頁次另存新檔" },
  { id: "rotate", number: "03", title: "旋轉頁面", note: "一次調整所有頁面的方向" },
  { id: "compress", number: "04", title: "縮小檔案", note: "最佳化頁面影像，減少檔案大小" },
  { id: "organize", number: "05", title: "整理頁面", note: "重新排序，或刪除不需要的頁面" },
  { id: "number", number: "06", title: "加入頁碼", note: "在每頁下方加上連續頁碼" },
  { id: "pdfToJpg", number: "07", title: "PDF 轉 JPG", note: "將每一頁匯出成清晰圖片" },
  { id: "imageToPdf", number: "08", title: "圖片轉 PDF", note: "把 JPG、PNG 圖片合成 PDF" },
];

function downloadPdf(bytes: Uint8Array, filename: string) {
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parsePageRange(input: string, total: number) {
  const pages = new Set<number>();
  const tokens = input.split(",").map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) throw new Error("請輸入要擷取的頁碼。");

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const page = Number(token);
      if (page < 1 || page > total) throw new Error(`頁碼 ${page} 超出文件範圍。`);
      pages.add(page - 1);
      continue;
    }

    const match = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) throw new Error(`無法辨識「${token}」，請使用 1-3, 5 的格式。`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start < 1 || end > total || start > end) throw new Error(`頁碼範圍 ${token} 不正確。`);
    for (let page = start; page <= end; page += 1) pages.add(page - 1);
  }

  return [...pages].sort((a, b) => a - b);
}

function parsePageSequence(input: string, total: number) {
  const pages: number[] = [];
  const tokens = input.split(",").map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) throw new Error("請輸入要保留的頁碼。");
  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const page = Number(token);
      if (page < 1 || page > total) throw new Error(`頁碼 ${page} 超出文件範圍。`);
      pages.push(page - 1);
      continue;
    }
    const match = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) throw new Error(`無法辨識「${token}」。`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start < 1 || start > total || end < 1 || end > total) throw new Error(`頁碼範圍 ${token} 不正確。`);
    const step = start <= end ? 1 : -1;
    for (let page = start; page !== end + step; page += step) pages.push(page - 1);
  }
  return pages;
}

export default function Home() {
  const [active, setActive] = useState<Tool>("merge");
  const [files, setFiles] = useState<File[]>([]);
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [range, setRange] = useState("1-3");
  const [angle, setAngle] = useState(90);
  const [compression, setCompression] = useState<"balanced" | "small">("balanced");
  const [pageOrder, setPageOrder] = useState("1,2,3");
  const [startNumber, setStartNumber] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const activeTool = useMemo(() => tools.find((tool) => tool.id === active)!, [active]);

  function switchTool(tool: Tool) {
    setActive(tool);
    setFiles([]);
    setSingleFile(null);
    setMessage("");
  }

  async function runTool() {
    setMessage("");
    setBusy(true);

    try {
      if (active === "merge") {
        if (files.length < 2) throw new Error("請至少選擇兩份 PDF。 ");
        const output = await PDFDocument.create();
        for (const file of files) {
          const source = await PDFDocument.load(await file.arrayBuffer());
          const pages = await output.copyPages(source, source.getPageIndices());
          pages.forEach((page) => output.addPage(page));
        }
        downloadPdf(await output.save(), "合併完成.pdf");
      }

      if (active === "extract") {
        if (!singleFile) throw new Error("請先選擇一份 PDF。");
        const source = await PDFDocument.load(await singleFile.arrayBuffer());
        const pageIndices = parsePageRange(range, source.getPageCount());
        const output = await PDFDocument.create();
        const pages = await output.copyPages(source, pageIndices);
        pages.forEach((page) => output.addPage(page));
        downloadPdf(await output.save(), "擷取頁面.pdf");
      }

      if (active === "rotate") {
        if (!singleFile) throw new Error("請先選擇一份 PDF。");
        const output = await PDFDocument.load(await singleFile.arrayBuffer());
        output.getPages().forEach((page) => {
          page.setRotation(degrees((page.getRotation().angle + angle) % 360));
        });
        downloadPdf(await output.save(), "旋轉完成.pdf");
      }

      if (active === "compress") {
        if (!singleFile) throw new Error("請先選擇一份 PDF。");
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const sourceBytes = new Uint8Array(await singleFile.arrayBuffer());
        const source = await pdfjs.getDocument({ data: sourceBytes }).promise;
        const output = await PDFDocument.create();
        const settings = compression === "small"
          ? { scale: 0.95, quality: 0.55 }
          : { scale: 1.3, quality: 0.72 };

        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
          const page = await source.getPage(pageNumber);
          const pageSize = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: settings.scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("這個瀏覽器無法建立頁面畫布。");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", settings.quality));
          if (!blob) throw new Error("頁面影像最佳化失敗。");
          const image = await output.embedJpg(await blob.arrayBuffer());
          const outputPage = output.addPage([pageSize.width, pageSize.height]);
          outputPage.drawImage(image, { x: 0, y: 0, width: pageSize.width, height: pageSize.height });
          page.cleanup();
        }

        const compressedBytes = await output.save({ useObjectStreams: true });
        const reduction = Math.round((1 - compressedBytes.length / sourceBytes.length) * 100);
        if (compressedBytes.length < sourceBytes.length) {
          downloadPdf(compressedBytes, "縮小完成.pdf");
          setMessage(`完成！檔案縮小約 ${reduction}%，下載已經開始。`);
        } else {
          downloadPdf(sourceBytes, "原檔已最佳化.pdf");
          setMessage("這份 PDF 已經很精簡，保留原始品質並開始下載。");
        }
        return;
      }

      if (active === "organize") {
        if (!singleFile) throw new Error("請先選擇一份 PDF。");
        const source = await PDFDocument.load(await singleFile.arrayBuffer());
        const pageIndices = parsePageSequence(pageOrder, source.getPageCount());
        if (!pageIndices.length) throw new Error("請至少保留一頁。");
        const output = await PDFDocument.create();
        const pages = await output.copyPages(source, pageIndices);
        pages.forEach((page) => output.addPage(page));
        downloadPdf(await output.save(), "整理完成.pdf");
      }

      if (active === "number") {
        if (!singleFile) throw new Error("請先選擇一份 PDF。");
        const output = await PDFDocument.load(await singleFile.arrayBuffer());
        const font = await output.embedFont(StandardFonts.HelveticaBold);
        output.getPages().forEach((page, index) => {
          const text = String(startNumber + index);
          const size = 11;
          const width = font.widthOfTextAtSize(text, size);
          page.drawText(text, {
            x: page.getWidth() / 2 - width / 2,
            y: 16,
            size,
            font,
            color: rgb(0.09, 0.13, 0.19),
            opacity: 0.75,
          });
        });
        downloadPdf(await output.save(), "已加入頁碼.pdf");
      }

      if (active === "imageToPdf") {
        if (!files.length) throw new Error("請至少選擇一張 JPG 或 PNG 圖片。");
        const output = await PDFDocument.create();
        for (const file of files) {
          const bytes = await file.arrayBuffer();
          const image = file.type === "image/png" ? await output.embedPng(bytes) : await output.embedJpg(bytes);
          const page = output.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        downloadPdf(await output.save(), "圖片合成.pdf");
      }

      if (active === "pdfToJpg") {
        if (!singleFile) throw new Error("請先選擇一份 PDF。");
        const [{ default: JSZip }, pdfjs] = await Promise.all([import("jszip"), import("pdfjs-dist")]);
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const source = await pdfjs.getDocument({ data: new Uint8Array(await singleFile.arrayBuffer()) }).promise;
        const zip = new JSZip();
        for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
          const page = await source.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.7 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext("2d", { alpha: false });
          if (!context) throw new Error("這個瀏覽器無法建立頁面畫布。");
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
          if (!blob) throw new Error("圖片轉換失敗。");
          zip.file(`page-${String(pageNumber).padStart(3, "0")}.jpg`, blob);
          page.cleanup();
        }
        downloadBlob(await zip.generateAsync({ type: "blob" }), "PDF頁面圖片.zip");
      }

      setMessage("完成！下載已經開始。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "處理失敗，請確認檔案是否為有效的 PDF。");
    } finally {
      setBusy(false);
    }
  }

  const usesMultipleFiles = active === "merge" || active === "imageToPdf";
  const hasInput = usesMultipleFiles ? files.length > 0 : Boolean(singleFile);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PDF Breeze 首頁">
          <span className="brand-mark">P</span>
          <span>PDF BREEZE</span>
        </a>
        <div className="privacy-pill"><span /> 檔案不上傳</div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">SIMPLE PDF TOOLS · 瀏覽器直接處理</p>
          <h1>整理 PDF，<br /><em>不用繞遠路。</em></h1>
          <p className="intro">合併、擷取、旋轉，一次完成。你的文件只停留在這台裝置，不會被上傳到伺服器。</p>
          <a className="jump-link" href="#workspace">開始處理 <span>↓</span></a>
        </div>
        <div className="paper-stack" aria-hidden="true">
          <div className="paper paper-back"><span>03</span></div>
          <div className="paper paper-mid"><span>02</span></div>
          <div className="paper paper-front">
            <span className="pdf-label">PDF</span>
            <div className="paper-lines"><i /><i /><i /></div>
            <b>LOCAL<br />ONLY</b>
          </div>
        </div>
      </section>

      <section className="workspace" id="workspace">
        <div className="tool-nav" role="tablist" aria-label="PDF 工具">
          {tools.map((tool) => (
            <button
              key={tool.id}
              className={active === tool.id ? "tool-tab active" : "tool-tab"}
              onClick={() => switchTool(tool.id)}
              role="tab"
              aria-selected={active === tool.id}
            >
              <span>{tool.number}</span>
              <strong>{tool.title}</strong>
              <small>{tool.note}</small>
            </button>
          ))}
        </div>

        <div className="tool-panel" role="tabpanel">
          <div className="panel-heading">
            <div>
              <span className="panel-number">{activeTool.number}</span>
              <h2>{activeTool.title}</h2>
            </div>
            <p>{activeTool.note}</p>
          </div>

          <label className={hasInput ? "dropzone has-file" : "dropzone"}>
            <input
              type="file"
              accept={active === "imageToPdf" ? "image/jpeg,image/png,.jpg,.jpeg,.png" : "application/pdf,.pdf"}
              multiple={usesMultipleFiles}
              onChange={(event) => {
                const picked = Array.from(event.target.files ?? []);
                if (usesMultipleFiles) setFiles(picked);
                else setSingleFile(picked[0] ?? null);
                setMessage("");
              }}
            />
            <span className="plus">＋</span>
            <strong>{hasInput ? "已選擇檔案" : active === "imageToPdf" ? "選擇 JPG 或 PNG 圖片" : "選擇 PDF 檔案"}</strong>
            <small>
              {usesMultipleFiles && files.length > 0
                ? `${files.length} 個檔案 · ${files.map((file) => file.name).join("、")}`
                : singleFile?.name ?? "點一下瀏覽，或將檔案拖曳到這裡"}
            </small>
          </label>

          {active === "extract" && (
            <label className="field-row">
              <span>要擷取的頁碼</span>
              <input value={range} onChange={(event) => setRange(event.target.value)} placeholder="例如：1-3, 5, 8-10" />
            </label>
          )}

          {active === "rotate" && (
            <div className="field-row">
              <span>旋轉角度</span>
              <div className="angle-options">
                {[90, 180, 270].map((value) => (
                  <button key={value} className={angle === value ? "selected" : ""} onClick={() => setAngle(value)}>
                    {value}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {active === "compress" && (
            <div className="field-row compression-row">
              <span>縮小程度</span>
              <div>
                <div className="angle-options">
                  <button className={compression === "balanced" ? "selected" : ""} onClick={() => setCompression("balanced")}>平衡品質</button>
                  <button className={compression === "small" ? "selected" : ""} onClick={() => setCompression("small")}>檔案最小</button>
                </div>
                <small>縮小會將頁面重新製成影像，文字選取、搜尋和連結可能無法保留。</small>
              </div>
            </div>
          )}

          {active === "organize" && (
            <label className="field-row">
              <span>保留與排列頁次</span>
              <div>
                <input value={pageOrder} onChange={(event) => setPageOrder(event.target.value)} placeholder="例如：3, 1-2, 5" />
                <small className="field-note">依輸入順序建立新檔；省略的頁碼會被刪除。</small>
              </div>
            </label>
          )}

          {active === "number" && (
            <label className="field-row">
              <span>起始頁碼</span>
              <input type="number" min="1" value={startNumber} onChange={(event) => setStartNumber(Math.max(1, Number(event.target.value)))} />
            </label>
          )}

          <div className="action-row">
            <p className={message.includes("完成") ? "status success" : "status"} aria-live="polite">{message}</p>
            <button className="primary-button" onClick={runTool} disabled={busy}>
              {busy ? "處理中…" : `${activeTool.title.replace(" PDF", "")}並下載`} <span>→</span>
            </button>
          </div>
        </div>
      </section>

      <section className="promise">
        <span>PRIVACY BY DEFAULT</span>
        <h2>你的文件，<br />一直都只是你的。</h2>
        <p>所有處理都在目前的瀏覽器分頁裡完成。關閉頁面後，檔案不會留下副本。</p>
      </section>

      <footer>
        <span>PDF BREEZE</span>
        <p>輕巧、快速、尊重隱私的 PDF 工具。</p>
      </footer>
    </main>
  );
}
