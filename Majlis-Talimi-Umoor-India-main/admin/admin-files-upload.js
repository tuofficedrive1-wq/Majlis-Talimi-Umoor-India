// admin-files-upload.js
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export const initAdminFilesManager = (app, db) => {
    const storage = getStorage(app);
    const form = document.getElementById('admin-file-upload-form');
    const fileInput = document.getElementById('upload-file-input');
    const titleInput = document.getElementById('upload-file-title');
    const submitBtn = document.getElementById('upload-file-btn');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const statusText = document.getElementById('upload-status-text');
    const tbody = document.getElementById('uploaded-files-tbody');

    if (!form || !tbody) return;

    // 1. Firebase se uploaded files fetch karke table me dikhana
    const q = query(collection(db, "admin_files"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-500">Abhi tak koi file upload nahi ki gayi hai.</td></tr>';
            return;
        }
        
        let html = '';
        let count = 1;
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-IN') : 'N/A';
            
            // File type ke hisaab se icon set karna
            let icon = 'fa-file-alt';
            let color = 'text-gray-500';
            if (data.fileType.includes('pdf')) { icon = 'fa-file-pdf'; color = 'text-red-500'; }
            else if (data.fileType.includes('image')) { icon = 'fa-image'; color = 'text-blue-500'; }
            else if (data.fileType.includes('sheet') || data.fileType.includes('excel') || data.fileType.includes('csv')) { icon = 'fa-file-excel'; color = 'text-emerald-500'; }

            html += `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-center border-r text-gray-500">${count++}</td>
                    <td class="p-3 border-r font-bold text-slate-700 urdu-font">${data.fileName}</td>
                    <td class="p-3 border-r text-center"><i class="fas ${icon} ${color} text-xl" title="${data.fileType}"></i></td>
                    <td class="p-3 border-r text-center text-sm text-gray-600">${dateStr}</td>
                    <td class="p-3 text-center space-x-2">
                        <a href="${data.fileUrl}" target="_blank" class="bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-600 hover:text-white transition shadow-sm text-xs font-bold inline-block" title="View"><i class="fas fa-eye"></i></a>
                        <button onclick="window.deleteAdminFile('${docSnap.id}', '${data.storagePath || ''}')" class="bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition shadow-sm text-xs font-bold" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    });

    // 2. Nayi file Firebase Storage me upload karna
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        const title = titleInput.value.trim();

        if (!file || !title) return alert("File aur Title dono zaroori hain.");

        // UI Update: Progress Bar show karein
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Uploading...';
        progressContainer.classList.remove('hidden');
        statusText.classList.remove('hidden');

        // Storage Path (Taki duplicate names clash na karein)
        const filePath = `admin_uploads/${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = progress + '%';
                statusText.textContent = `Uploading: ${Math.round(progress)}%`;
            }, 
            (error) => {
                console.error("Upload Error:", error);
                alert("Upload fail ho gaya: " + error.message);
                resetForm();
            }, 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                
                // Firestore Database me File ki Details save karna
                await addDoc(collection(db, "admin_files"), {
                    fileName: title,
                    fileUrl: downloadURL,
                    fileType: file.type || 'unknown',
                    storagePath: filePath, // Yeh baad me delete karne ke kaam ayega
                    createdAt: serverTimestamp()
                });

                alert("File successfully upload ho gayi!");
                resetForm();
            }
        );
    });

    const resetForm = () => {
        form.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-upload mr-2"></i> Upload File';
        progressContainer.classList.add('hidden');
        statusText.classList.add('hidden');
        progressBar.style.width = '0%';
    };

    // 3. Delete File Logic (Storage + Firestore)
    window.deleteAdminFile = async (docId, storagePath) => {
        if (!confirm("Kya aap waqai is file ko delete karna chahte hain? Users isey mazeed dekh ya download nahi kar sakenge.")) return;
        
        try {
            // Database se Delete karein
            await deleteDoc(doc(db, "admin_files", docId));
            
            // Storage se asal file delete karein
            if (storagePath) {
                const delRef = storageRef(storage, storagePath);
                await deleteObject(delRef).catch(e => console.log("Storage object already deleted", e));
            }
            alert("File successfully delete ho gayi.");
        } catch (e) {
            console.error("Error deleting file:", e);
            alert("Delete karne mein masla aaya.");
        }
    };
};