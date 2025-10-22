/**
 * Download helper functions for Microsoft Edge compatibility
 * Handles PDF and Excel file downloads across different browsers
 */

function downloadFile(url, filename) {
    // Create a temporary anchor element for download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // For Microsoft Edge compatibility (legacy Edge)
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // IE/Edge specific method
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                window.navigator.msSaveOrOpenBlob(blob, filename);
            })
            .catch(error => {
                console.error('Download failed:', error);
                // Fallback to regular download
                fallbackDownload(link);
            });
    } else {
        // Modern browsers (including new Edge based on Chromium)
        fallbackDownload(link);
    }
}

function fallbackDownload(link) {
    try {
        // Add to DOM temporarily
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
    } catch (error) {
        console.error('Fallback download failed:', error);
        // Try force download as last resort
        forceDownload(link.href, link.download);
    }
}

// Alternative method for stubborn files
function forceDownload(url, filename) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = filename;
            
            // Ensure the link is added to DOM for some browsers
            link.style.display = 'none';
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
        })
        .catch(error => {
            console.error('Force download failed:', error);
            alert('Le téléchargement a échoué. Veuillez réessayer ou contacter le support technique.\n\nErreur: ' + error.message);
        });
}

// Check if file exists before attempting download
function checkFileAndDownload(url, filename) {
    fetch(url, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                downloadFile(url, filename);
            } else {
                throw new Error(`File not found: ${response.status}`);
            }
        })
        .catch(error => {
            console.error('File check failed:', error);
            alert('Le fichier demandé est introuvable. Veuillez contacter le support technique.');
        });
}
