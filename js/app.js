// S5 Study Vault — Flipbook App Controller
// GPU-accelerated PDF flipbook viewer with pdf.js

// ===== PDF.js Configuration =====
pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/pdf.worker.js';

// ===== State =====
let currentPdf = null;
let currentPage = 1;
let totalPages = 1;
let currentZoom = 1.0;
let flipbookData = [];

// ===== DOM Elements =====
const libraryGrid = document.getElementById('library-grid');
const modal = document.getElementById('flipbook-modal');
const flipbookTitle = document.getElementById('flipbook-title');
const pdfCanvas = document.getElementById('pdf-canvas');
const pageSlider = document.getElementById('page-slider');
const currentDisplay = document.getElementById('current-page');
const totalDisplay = document.getElementById('total-pages');

// ===== Load Library =====
async function loadLibrary() {
    try {
        const response = await fetch('data/books.json');
        flipbookData = await response.json();
        renderLibrary();
    } catch (e) {
        console.log('No books.json yet — empty library');
        libraryGrid.innerHTML = '<p class="subtitle">No materials uploaded yet. Check back later!</p>';
    }
}

// ===== Render Book Cards =====
function renderLibrary() {
    libraryGrid.innerHTML = flipbookData.books.map((book, index) => `
        <div class="book-card" style="animation-delay: ${index * 0.05}s" onclick="openFlipbook('${book.id}', '${book.title}', ${book.pages})">
            <div class="book-cover">
                <img src="${book.cover || 'js/default-cover.png'}" alt="${book.title}">
            </div>
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="book-meta">
                    <span>${book.category}</span>
                    <span class="book-pages"><i class="fas fa-file-pages"></i> ${book.pages} pages</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== Open Flipbook =====
async function openFlipbook(bookId, title, pages) {
    modal.classList.remove('hidden');
    flipbookTitle.textContent = title;
    totalPages = pages;
    currentPage = 1;
    currentDisplay.textContent = currentPage;
    totalDisplay.textContent = totalPages;
    pageSlider.max = totalPages;
    pageSlider.value = 1;

    // Load the PDF
    const url = `pdfs/${bookId}.pdf`;
    currentPdf = await pdfjsLib.getDocument(url).promise;
    totalPages = currentPdf.numPages;
    totalDisplay.textContent = totalPages;
    pageSlider.max = totalPages;

    renderPage(currentPage);
}

// ===== Render Page =====
async function renderPage(pageNum) {
    if (!currentPdf) return;

    const page = await currentPdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentZoom });

    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;

    const context = pdfCanvas.getContext('2d');
    context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    currentDisplay.textContent = pageNum;
    pageSlider.value = pageNum;
    currentPage = pageNum;
}

// ===== Navigation =====
function prevPage() {
    if (currentPage > 1) renderPage(--currentPage);
}

function nextPage() {
    if (currentPage < totalPages) renderPage(++currentPage);
}

// ===== Zoom =====
function zoomIn() {
    currentZoom *= 1.2;
    renderPage(currentPage);
}

function zoomOut() {
    currentZoom /= 1.2;
    currentZoom = Math.max(0.3, currentZoom);
    renderPage(currentPage);
}

// ===== Close =====
function closeFlipbook() {
    modal.classList.add('hidden');
    currentPdf = null;
}

// ===== Keyboard Navigation =====
document.addEventListener('keydown', (e) => {
    if (modal.classList.contains('hidden')) return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            prevPage();
            break;
        case 'ArrowRight':
            e.preventDefault();
            nextPage();
            break;
        case ' ':
            e.preventDefault();
            if (currentPage < totalPages) nextPage();
            else prevPage();
            break;
        case 'Escape':
            closeFlipbook();
            break;
    }
});

// ===== Event Listeners =====
pageSlider?.addEventListener('input', (e) => {
    if (currentPdf) renderPage(parseInt(e.target.value));
});

// Close on outside click
modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeFlipbook();
});

// ===== Touch / Swipe Support for Mobile =====
let touchStartX = 0;
let touchStartY = 0;

modal?.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

modal?.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Swipe left/right (horizontal swipes only)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) prevPage();
        else nextPage();
    }
});

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', loadLibrary);
