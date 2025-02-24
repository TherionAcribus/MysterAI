// Initialisation de l'éditeur d'image avec Fabric.js
let canvas;
let currentTool = 'select';
let isDrawing = false;

// Configuration des outils
const toolConfig = {
    brush: {
        width: 5,
        color: '#000000',
        shadowBlur: 0
    }
};

// Fonction d'initialisation
function initializeEditor() {
    // Initialiser le canvas
    canvas = new fabric.Canvas('editor-canvas', {
        isDrawingMode: false
    });

    // Ajuster la taille du canvas au conteneur
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        if (container) {
            canvas.setWidth(container.offsetWidth);
            canvas.setHeight(container.offsetHeight);
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Charger l'image depuis l'attribut data-image-url
    const canvasElement = document.getElementById('editor-canvas');
    const imageUrl = canvasElement.dataset.imageUrl;
    if (imageUrl) {
        fabric.Image.fromURL(imageUrl, function(img) {
            // Ajuster l'image à la taille du canvas
            const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height
            );
            img.scale(scale);
            
            // Centrer l'image
            img.set({
                left: (canvas.width - img.width * scale) / 2,
                top: (canvas.height - img.height * scale) / 2,
                selectable: false,
                evented: false
            });
            
            canvas.add(img);
            canvas.renderAll();
        });
    }

    // Gestionnaire pour les outils
    const tools = document.querySelectorAll('.tool-btn');
    tools.forEach(tool => {
        tool.addEventListener('click', function() {
            const toolType = this.dataset.tool;
            currentTool = toolType;
            
            // Désactiver tous les boutons
            tools.forEach(t => t.classList.remove('active'));
            // Activer le bouton courant
            this.classList.add('active');

            switch(toolType) {
                case 'select':
                    canvas.isDrawingMode = false;
                    canvas.selection = true;
                    break;
                case 'move':
                    canvas.isDrawingMode = false;
                    canvas.selection = true;
                    break;
                case 'brush':
                    canvas.isDrawingMode = true;
                    updateBrushStyle();
                    break;
                case 'eraser':
                    canvas.isDrawingMode = true;
                    canvas.freeDrawingBrush.color = '#ffffff';
                    break;
                case 'rect':
                    canvas.isDrawingMode = false;
                    addRect();
                    break;
                case 'circle':
                    canvas.isDrawingMode = false;
                    addCircle();
                    break;
                case 'text':
                    canvas.isDrawingMode = false;
                    addText();
                    break;
            }
        });
    });

    // Gestionnaire pour la couleur
    const strokeColor = document.getElementById('stroke-color');
    if (strokeColor) {
        strokeColor.addEventListener('input', function(e) {
            toolConfig.brush.color = e.target.value;
            if (currentTool === 'brush') {
                canvas.freeDrawingBrush.color = e.target.value;
            }
        });
    }

    // Gestionnaire pour la taille du pinceau
    const brushSize = document.getElementById('brush-size');
    if (brushSize) {
        brushSize.addEventListener('input', function(e) {
            const size = parseInt(e.target.value);
            toolConfig.brush.width = size;
            if (currentTool === 'brush') {
                canvas.freeDrawingBrush.width = size;
            }
        });
    }

    // Gestionnaire pour le bouton Clear
    const clearBtn = document.getElementById('clear-canvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            canvas.clear();
        });
    }

    // Gestionnaire pour le bouton Save
    const saveBtn = document.getElementById('save-image');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            // Récupérer l'ID de l'image depuis le dataset du canvas
            const canvasElement = document.getElementById('editor-canvas');
            const imageId = canvasElement.dataset.imageId;
            
            if (!imageId) {
                console.error('ID de l\'image non trouvé');
                alert('Erreur : ID de l\'image non trouvé');
                return;
            }

            // Convertir le canvas en base64
            const imageData = canvas.toDataURL({
                format: 'jpeg',
                quality: 0.8
            });

            // Envoyer l'image au serveur
            fetch('/api/geocaches/images/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    parent_image_id: imageId,
                    image_data: imageData
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Error saving image: ' + data.error);
                } else {
                    alert('Image saved successfully!');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error saving image');
            });
        });
    }

    // Fonctions d'aide pour les formes
    function addRect() {
        const rect = new fabric.Rect({
            left: canvas.width / 2 - 50,
            top: canvas.height / 2 - 50,
            fill: 'transparent',
            stroke: toolConfig.brush.color,
            width: 100,
            height: 100,
            strokeWidth: 2
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
    }

    function addCircle() {
        const circle = new fabric.Circle({
            left: canvas.width / 2 - 50,
            top: canvas.height / 2 - 50,
            fill: 'transparent',
            stroke: toolConfig.brush.color,
            radius: 50,
            strokeWidth: 2
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
    }

    function addText() {
        const text = new fabric.IText('Double-click to edit', {
            left: canvas.width / 2,
            top: canvas.height / 2,
            fontFamily: 'Arial',
            fill: toolConfig.brush.color,
            fontSize: 20
        });
        canvas.add(text);
        canvas.setActiveObject(text);
    }

    // Fonction pour mettre à jour le style du pinceau
    function updateBrushStyle() {
        canvas.freeDrawingBrush.color = toolConfig.brush.color;
        canvas.freeDrawingBrush.width = toolConfig.brush.width;
        canvas.freeDrawingBrush.shadowBlur = toolConfig.brush.shadowBlur;
    }

    // Sélectionner l'outil par défaut
    const defaultTool = document.querySelector('[data-tool="select"]');
    if (defaultTool) {
        defaultTool.click();
    }
}

// Attendre que le DOM soit chargé et que Fabric.js soit disponible
function waitForFabric() {
    if (typeof fabric === 'undefined') {
        setTimeout(waitForFabric, 100);
        return;
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEditor);
    } else {
        initializeEditor();
    }
}

// Démarrer l'initialisation
waitForFabric();
