// Initialisation de l'éditeur d'image avec Fabric.js
let canvas;
let currentTool = 'brush';
let isDrawing = false;

// Configuration des outils
const toolConfig = {
    brush: {
        width: 5,
        color: '#000000',
        shadowBlur: 0
    },
    shape: {
        stroke: '#000000',
        fill: 'transparent',
        strokeWidth: 2
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le canvas
    canvas = new fabric.Canvas('editor-canvas', {
        isDrawingMode: true
    });

    // Ajuster la taille du canvas au conteneur
    function resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        canvas.setWidth(container.offsetWidth);
        canvas.setHeight(container.offsetHeight);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Charger l'image depuis l'attribut data-image-url
    const imageUrl = canvas.wrapperEl.getAttribute('data-image-url');
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
                top: (canvas.height - img.height * scale) / 2
            });
            
            canvas.add(img);
            canvas.renderAll();
        });
    }

    // Gestionnaire pour le pinceau
    const brushTool = document.getElementById('brush-tool');
    brushTool.addEventListener('click', function() {
        currentTool = 'brush';
        canvas.isDrawingMode = true;
        updateBrushStyle();
    });

    // Gestionnaire pour les formes
    const shapeTool = document.getElementById('shape-tool');
    shapeTool.addEventListener('click', function() {
        currentTool = 'shape';
        canvas.isDrawingMode = false;
    });

    // Gestionnaire pour la couleur du trait
    const strokeColor = document.getElementById('stroke-color');
    strokeColor.addEventListener('input', function(e) {
        if (currentTool === 'brush') {
            toolConfig.brush.color = e.target.value;
            canvas.freeDrawingBrush.color = e.target.value;
        } else {
            toolConfig.shape.stroke = e.target.value;
        }
    });

    // Gestionnaire pour la couleur de remplissage
    const fillColor = document.getElementById('fill-color');
    fillColor.addEventListener('input', function(e) {
        toolConfig.shape.fill = e.target.value;
    });

    // Gestionnaire pour la taille du pinceau
    const brushSize = document.getElementById('brush-size');
    brushSize.addEventListener('input', function(e) {
        const size = parseInt(e.target.value);
        if (currentTool === 'brush') {
            toolConfig.brush.width = size;
            canvas.freeDrawingBrush.width = size;
        } else {
            toolConfig.shape.strokeWidth = size;
        }
    });

    // Gestionnaire pour le bouton Clear
    const clearBtn = document.getElementById('clear-canvas');
    clearBtn.addEventListener('click', function() {
        canvas.clear();
    });

    // Gestionnaire pour le bouton Save
    const saveBtn = document.getElementById('save-image');
    saveBtn.addEventListener('click', function() {
        // Récupérer l'ID de l'image parent depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const imageId = window.location.pathname.split('/').pop();

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

    // Fonction pour mettre à jour le style du pinceau
    function updateBrushStyle() {
        if (currentTool === 'brush') {
            canvas.freeDrawingBrush.color = toolConfig.brush.color;
            canvas.freeDrawingBrush.width = toolConfig.brush.width;
            canvas.freeDrawingBrush.shadowBlur = toolConfig.brush.shadowBlur;
        }
    }

    // Initialiser les styles
    updateBrushStyle();
});
