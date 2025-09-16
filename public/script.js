class GeminiImageEditor {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.selectedFile = null;
    }

    initializeElements() {
        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.imageInput = document.getElementById('imageInput');
        this.previewImage = document.getElementById('previewImage');
        
        // Manipulation elements
        this.manipulatePrompt = document.getElementById('manipulatePrompt');
        this.manipulateBtn = document.getElementById('manipulateBtn');
        this.manipulateError = document.getElementById('manipulateError');
        this.manipulateSuccess = document.getElementById('manipulateSuccess');
        
        // Generation elements
        this.generatePrompt = document.getElementById('generatePrompt');
        this.generateBtn = document.getElementById('generateBtn');
        this.generateError = document.getElementById('generateError');
        this.generateSuccess = document.getElementById('generateSuccess');
        
        // Child generation elements
        this.parent1UploadArea = document.getElementById('parent1UploadArea');
        this.parent1Input = document.getElementById('parent1Input');
        this.parent1Preview = document.getElementById('parent1Preview');
        this.parent2UploadArea = document.getElementById('parent2UploadArea');
        this.parent2Input = document.getElementById('parent2Input');
        this.parent2Preview = document.getElementById('parent2Preview');
        this.childPrompt = document.getElementById('childPrompt');
        this.generateChildBtn = document.getElementById('generateChildBtn');
        this.childError = document.getElementById('childError');
        this.childSuccess = document.getElementById('childSuccess');
        
        // Results elements
        this.loading = document.getElementById('loading');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsGrid = document.getElementById('resultsGrid');
        
        // Store selected files
        this.parent1File = null;
        this.parent2File = null;
    }

    bindEvents() {
        // Upload area events
        this.uploadArea.addEventListener('click', () => this.imageInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        
        // File input change
        this.imageInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // Button events
        this.manipulateBtn.addEventListener('click', this.manipulateImage.bind(this));
        this.generateBtn.addEventListener('click', this.generateImage.bind(this));
        this.generateChildBtn.addEventListener('click', this.generateChild.bind(this));
        
        // Parent upload events
        this.parent1UploadArea.addEventListener('click', () => this.parent1Input.click());
        this.parent1UploadArea.addEventListener('dragover', (e) => this.handleParentDragOver(e, this.parent1UploadArea));
        this.parent1UploadArea.addEventListener('dragleave', (e) => this.handleParentDragLeave(e, this.parent1UploadArea));
        this.parent1UploadArea.addEventListener('drop', (e) => this.handleParentDrop(e, 'parent1'));
        
        this.parent2UploadArea.addEventListener('click', () => this.parent2Input.click());
        this.parent2UploadArea.addEventListener('dragover', (e) => this.handleParentDragOver(e, this.parent2UploadArea));
        this.parent2UploadArea.addEventListener('dragleave', (e) => this.handleParentDragLeave(e, this.parent2UploadArea));
        this.parent2UploadArea.addEventListener('drop', (e) => this.handleParentDrop(e, 'parent2'));
        
        // Parent file input changes
        this.parent1Input.addEventListener('change', (e) => this.handleParentFileSelect(e, 'parent1'));
        this.parent2Input.addEventListener('change', (e) => this.handleParentFileSelect(e, 'parent2'));
        
        // Prompt input events
        this.manipulatePrompt.addEventListener('input', this.updateManipulateButton.bind(this));
        this.childPrompt.addEventListener('input', this.updateChildButton.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError(this.manipulateError, 'Please select a valid image file.');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError(this.manipulateError, 'File size must be less than 10MB.');
            return;
        }

        this.selectedFile = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            this.previewImage.src = e.target.result;
            this.previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        // Update upload area text
        this.uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
            </div>
            <p><strong>Image uploaded successfully!</strong></p>
            <p style="font-size: 0.9rem; color: #666;">${file.name}</p>
        `;
        
        this.updateManipulateButton();
        this.hideError(this.manipulateError);
    }

    updateManipulateButton() {
        const hasFile = this.selectedFile !== null;
        const hasPrompt = this.manipulatePrompt.value.trim().length > 0;
        this.manipulateBtn.disabled = !(hasFile && hasPrompt);
    }

    handleParentDragOver(e, uploadArea) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    }

    handleParentDragLeave(e, uploadArea) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    }

    handleParentDrop(e, parentType) {
        e.preventDefault();
        const uploadArea = parentType === 'parent1' ? this.parent1UploadArea : this.parent2UploadArea;
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleParentFile(files[0], parentType);
        }
    }

    handleParentFileSelect(e, parentType) {
        const file = e.target.files[0];
        if (file) {
            this.handleParentFile(file, parentType);
        }
    }

    handleParentFile(file, parentType) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError(this.childError, 'Please select a valid image file.');
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError(this.childError, 'File size must be less than 10MB.');
            return;
        }

        if (parentType === 'parent1') {
            this.parent1File = file;
            this.updateParentUploadArea(file, this.parent1UploadArea, this.parent1Preview);
        } else {
            this.parent2File = file;
            this.updateParentUploadArea(file, this.parent2UploadArea, this.parent2Preview);
        }
        
        this.updateChildButton();
        this.hideError(this.childError);
    }

    updateParentUploadArea(file, uploadArea, previewImage) {
        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        // Update upload area text
        uploadArea.innerHTML = `
            <div class="upload-icon">
                <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
            </div>
            <p><strong>Image uploaded!</strong></p>
            <p style="font-size: 0.9rem; color: #666;">${file.name}</p>
        `;
    }

    updateChildButton() {
        const hasParent1 = this.parent1File !== null;
        this.generateChildBtn.disabled = !hasParent1;
    }

    async generateChild() {
        if (!this.parent1File) {
            this.showError(this.childError, 'Please upload at least one parent image.');
            return;
        }

        this.showLoading();
        this.hideMessages();

        try {
            const formData = new FormData();
            formData.append('parent1', this.parent1File);
            if (this.parent2File) {
                formData.append('parent2', this.parent2File);
            }
            if (this.childPrompt.value.trim()) {
                formData.append('prompt', this.childPrompt.value.trim());
            }

            const response = await fetch('/api/generate-child', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate child image');
            }

            this.showResults(result, 'Child Generation');
            this.showSuccess(this.childSuccess, result.textResponse);

        } catch (error) {
            console.error('Error generating child image:', error);
            this.showError(this.childError, error.message);
        } finally {
            this.hideLoading();
        }
    }

    async manipulateImage() {
        if (!this.selectedFile || !this.manipulatePrompt.value.trim()) {
            this.showError(this.manipulateError, 'Please upload an image and enter a prompt.');
            return;
        }

        this.showLoading();
        this.hideMessages();

        try {
            const formData = new FormData();
            formData.append('image', this.selectedFile);
            formData.append('prompt', this.manipulatePrompt.value.trim());

            const response = await fetch('/api/manipulate-image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to manipulate image');
            }

            this.showResults(result, 'Image Manipulation');
            this.showSuccess(this.manipulateSuccess, result.textResponse);

        } catch (error) {
            console.error('Error manipulating image:', error);
            this.showError(this.manipulateError, error.message);
        } finally {
            this.hideLoading();
        }
    }

    async generateImage() {
        const prompt = this.generatePrompt.value.trim();
        if (!prompt) {
            this.showError(this.generateError, 'Please enter a prompt to generate an image.');
            return;
        }

        this.showLoading();
        this.hideMessages();

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate image');
            }

            this.showResults(result, 'Image Generation');
            this.showSuccess(this.generateSuccess, result.textResponse);

        } catch (error) {
            console.error('Error generating image:', error);
            this.showError(this.generateError, error.message);
        } finally {
            this.hideLoading();
        }
    }

    showResults(result, title) {
        this.resultsGrid.innerHTML = '';
        
        if (result.results && result.results.length > 0) {
            result.results.forEach((item, index) => {
                if (item.type === 'image') {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';
                    resultItem.innerHTML = `
                        <img src="${item.url}" alt="Generated Image ${index + 1}" class="result-image">
                        <div class="result-info">
                            <h4>${title} Result ${index + 1}</h4>
                            <p><strong>Prompt:</strong> ${result.prompt}</p>
                            <a href="${item.url}" download="${item.filename}" class="btn" style="margin-top: 10px; font-size: 0.9rem; padding: 8px 16px;">
                                <i class="fas fa-download"></i> Download
                            </a>
                        </div>
                    `;
                    this.resultsGrid.appendChild(resultItem);
                }
            });
            
            this.resultsSection.style.display = 'block';
            this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showLoading() {
        this.loading.classList.add('show');
        this.manipulateBtn.disabled = true;
        this.generateBtn.disabled = true;
    }

    hideLoading() {
        this.loading.classList.remove('show');
        this.updateManipulateButton();
        this.generateBtn.disabled = false;
    }

    showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    hideError(element) {
        element.style.display = 'none';
    }

    showSuccess(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    hideMessages() {
        this.hideError(this.manipulateError);
        this.hideError(this.generateError);
        this.hideError(this.childError);
        this.manipulateSuccess.style.display = 'none';
        this.generateSuccess.style.display = 'none';
        this.childSuccess.style.display = 'none';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GeminiImageEditor();
});
