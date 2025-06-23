(() => {
    if (!window.Stimulus) {
        console.error('Stimulus global manquant - OCRModalController non initialisé');
        return;
    }

    class OCRModalController extends Stimulus.Controller {
        static targets = ["backdrop", "content", "footer", "panel", "textarea"];

        connect() {
            console.log('=== OCRModalController connecté ===');
            // Stocker l'instance sur l'élément pour accès global simple
            this.element.ocrModalController = this;
        }

        showLoading() {
            console.log('=== OCRModalController.showLoading ===');
            this.contentTarget.innerHTML = `
                <div class="flex items-center space-x-2">
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"></path>
                    </svg>
                    <span>Analyse OCR en cours...</span>
                </div>`;
            this.open();
        }

        showResult(text, confidence) {
            console.log('=== OCRModalController.showResult ===', { text, confidence });
            const confPct = (confidence * 100).toFixed(1);
            this.contentTarget.innerHTML = `
                <p class="text-sm text-gray-400">Confiance&nbsp;: <span class="font-semibold text-white">${confPct}%</span></p>
                <textarea data-ocr-modal-target="textarea" class="w-full bg-gray-900 text-gray-100 p-2 rounded h-40 resize-y">${text}</textarea>
            `;
            this.open();
        }

        open() {
            this.backdropTarget.classList.remove('hidden');
        }

        close() {
            this.backdropTarget.classList.add('hidden');
        }

        copy() {
            if (navigator.clipboard && this.hasTextareaTarget) {
                const txt = this.textareaTarget.value;
                navigator.clipboard.writeText(txt).then(() => {
                    console.log('Texte OCR copié dans le presse-papiers');
                });
            }
        }
    }

    const application = Stimulus.Application.start();
    application.register('ocr-modal', OCRModalController);

    // Exposer helpers globaux
    window.OCRModal = {
        showLoading() {
            const ctrl = getController();
            ctrl?.showLoading();
        },
        showResult(text, conf) {
            const ctrl = getController();
            ctrl?.showResult(text, conf);
        }
    };

    function getController() {
        const el = document.getElementById('ocr-modal');
        return el ? el.ocrModalController || null : null;
    }
})();
