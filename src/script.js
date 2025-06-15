document.addEventListener('DOMContentLoaded', function() {
    const $ = id => document.getElementById(id);

    const fileInput = $('fileInput');
    const uploadBtn = $('uploadBtn');
    const dropArea = $('dropArea');
    const imagePreview = $('imagePreview');
    const generateBtn = $('generateBtn');
    const downloadBtn = $('downloadBtn');
    const qrCode = $('qrCode');
    const qualityRange = $('qualityRange');
    const foxMascot = $('foxMascot');

    let selectedFile = null;
    let currentQRCodeUrl = null;

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', e => {
        if (e.target.files?.length) handleFileSelection(e.target.files[0]);
    });

    ['dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropArea.addEventListener('dragover', () => dropArea.classList.add('active'));
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('active'));

    dropArea.addEventListener('drop', e => {
        dropArea.classList.remove('active');
        if (e.dataTransfer.files?.length) handleFileSelection(e.dataTransfer.files[0]);
    });

    function handleFileSelection(file) {
        if (!file.type.match('image.*')) return alert('Please select an image file (JPEG, PNG, WEBP, etc.)');
        if (file.size > 10 * 1024 * 1024) return alert('For best performance, please use images smaller than 10MB');

        selectedFile = file;
        const reader = new FileReader();

        reader.onload = e => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            generateBtn.disabled = false;
            qrCode.style.display = 'none';
            downloadBtn.disabled = true;
            if (currentQRCodeUrl) URL.revokeObjectURL(currentQRCodeUrl);
            currentQRCodeUrl = null;
        };

        reader.readAsDataURL(file);
    }

    generateBtn.addEventListener('click', async () => {
        if (!selectedFile) return alert('Please select an image first');

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spinner"></span> Optimizing Image...';

        try {
            await tryDirectGeneration();
        } catch (error) {
            console.log('Direct generation failed, trying alternative approach:', error);
            try {
                await tryUrlBasedGenerationNew();
            } catch (error) {
                console.error('All methods failed:', error);
                alert('Failed to generate QR code. Please try:\n1. Smaller image\n2. Simpler image\n3. Different format');
            }
        } finally {
            resetGenerateButton();
        }
    });

    function tryDirectGeneration() {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const { dataUrl } = optimizeImageForQR(img);
                    QRCode.toCanvas(qrCode, dataUrl, {
                        width: 300,
                        margin: 0,
                        color: { dark: '#000000', light: '#FFFFFF' },
                        errorCorrectionLevel: 'L'
                    }, err => err ? reject(err) : (setupDownload(qrCode), resolve()));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
        });
    }

    async function tryUrlBasedGenerationNew() {
        const apiKey = "2bca9fb45e11f8d204d11e65872b5b38";
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onloadend = async function () {
                try {
                    const base64 = reader.result.replace(/^data:image\/[a-z]+;base64,/, "");

                    const formData = new FormData();
                    formData.append("key", apiKey);
                    formData.append("image", base64);

                    const response = await fetch("https://api.imgbb.com/1/upload", {
                        method: "POST",
                        body: formData
                    });

                    const result = await response.json();
                    const imageUrl = result.data.url;

                    await generateQRFromUrl(imageUrl);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };

            reader.readAsDataURL(selectedFile);
        });
    }

    function optimizeImageForQR(img) {
        const canvas = document.createElement('canvas');
        const maxDimension = 400;
        let width = img.width > img.height ? Math.min(maxDimension, img.width) : (img.width / img.height) * Math.min(maxDimension, img.height);
        let height = img.width > img.height ? (img.height / img.width) * width : Math.min(maxDimension, img.height);

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }

        ctx.putImageData(imageData, 0, 0);
        return { canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.2) };
    }

    function generateQRFromUrl(url) {
        return new Promise((resolve, reject) => {
            QRCode.toCanvas(qrCode, url, {
                width: 300,
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' },
                errorCorrectionLevel: 'M'
            }, err => err ? reject(err) : (setupDownload(qrCode), resolve()));
        });
    }

    function setupDownload(canvas) {
        qrCode.style.display = 'block';
        downloadBtn.disabled = false;

        canvas.toBlob(blob => {
            if (currentQRCodeUrl) URL.revokeObjectURL(currentQRCodeUrl);
            currentQRCodeUrl = URL.createObjectURL(blob);
            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.href = currentQRCodeUrl;
                a.download = `foxqr_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => document.body.removeChild(a), 100);
            };
        }, 'image/png');
    }

    function resetGenerateButton() {
        generateBtn.disabled = false;
        generateBtn.innerHTML = 'Generate QR Code';
    }

    foxMascot.addEventListener('click', () => {
        alert('🦊 Hi there! I\'m Foxy, your QR code assistant!\n\nTry dragging a big image and adjusting the quality slider for best results!');
        foxMascot.style.transform = 'scale(1.2) rotate(20deg)';
        setTimeout(() => { foxMascot.style.transform = ''; }, 500);
    });

    const style = document.createElement('style');
    style.textContent = `
        .spinner {
            display: inline-block;
            width: 18px;
            height: 18px;
            margin-right: 8px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});
