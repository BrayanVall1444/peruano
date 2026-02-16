const url = "comida.pdf"

const canvas = document.getElementById("pdfCanvas")
const ctx = canvas.getContext("2d")

const prevBtn = document.getElementById("prev")
const nextBtn = document.getElementById("next")
const zoomInBtn = document.getElementById("zoomIn")
const zoomOutBtn = document.getElementById("zoomOut")
const zoomLabel = document.getElementById("zoomLabel")

const pageNumEl = document.getElementById("pageNum")
const pageCountEl = document.getElementById("pageCount")

const fallback = document.getElementById("fallback")
const stage = document.getElementById("stage")

let pdfDoc = null
let pageNum = 1
let scale = 1
let rendering = false
let pendingPage = null

function setZoomLabel() {
  zoomLabel.textContent = `${Math.round(scale * 100)}%`
}

function updateButtons() {
  prevBtn.disabled = !pdfDoc || pageNum <= 1 || rendering
  nextBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages || rendering
  zoomOutBtn.disabled = !pdfDoc || rendering || scale <= 0.5
  zoomInBtn.disabled = !pdfDoc || rendering || scale >= 3
}

function showFallback() {
  fallback.classList.remove("hidden")
  stage.classList.add("hidden")
}

function showStage() {
  fallback.classList.add("hidden")
  stage.classList.remove("hidden")
}

async function renderPage(num) {
  if (!pdfDoc) return
  rendering = true
  updateButtons()

  const page = await pdfDoc.getPage(num)
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const viewport = page.getViewport({ scale })

  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  await page.render({ canvasContext: ctx, viewport }).promise

  pageNumEl.textContent = String(pageNum)
  pageCountEl.textContent = String(pdfDoc.numPages)
  setZoomLabel()

  rendering = false
  updateButtons()

  if (pendingPage !== null) {
    const next = pendingPage
    pendingPage = null
    renderPage(next)
  }
}

function queueRender(num) {
  if (rendering) {
    pendingPage = num
  } else {
    renderPage(num)
  }
}

function clampScale(v) {
  return Math.min(3, Math.max(0.5, v))
}

function bindUI() {
  prevBtn.addEventListener("click", () => {
    if (!pdfDoc || pageNum <= 1) return
    pageNum -= 1
    queueRender(pageNum)
  })

  nextBtn.addEventListener("click", () => {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return
    pageNum += 1
    queueRender(pageNum)
  })

  zoomInBtn.addEventListener("click", () => {
    scale = clampScale(scale + 0.1)
    queueRender(pageNum)
  })

  zoomOutBtn.addEventListener("click", () => {
    scale = clampScale(scale - 0.1)
    queueRender(pageNum)
  })

  window.addEventListener("keydown", (e) => {
    if (!pdfDoc) return
    if (e.key === "ArrowLeft") prevBtn.click()
    if (e.key === "ArrowRight") nextBtn.click()
    if (e.key === "+" || e.key === "=") zoomInBtn.click()
    if (e.key === "-") zoomOutBtn.click()
  })

  window.addEventListener("resize", () => {
    if (!pdfDoc) return
    queueRender(pageNum)
  })
}

async function init() {
  try {
    if (!window.pdfjsLib) {
      showFallback()
      return
    }

    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js"

    bindUI()
    updateButtons()
    showStage()

    const loadingTask = window.pdfjsLib.getDocument(url)
    pdfDoc = await loadingTask.promise

    pageCountEl.textContent = String(pdfDoc.numPages)
    pageNum = 1
    scale = 1
    setZoomLabel()
    updateButtons()
    await renderPage(pageNum)
  } catch (e) {
    showFallback()
  }
}

init()
