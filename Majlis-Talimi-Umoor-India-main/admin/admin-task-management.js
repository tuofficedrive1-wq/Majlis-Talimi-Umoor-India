import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    onSnapshot, 
    query, 
    orderBy, 
    deleteDoc, 
    doc 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global map user names yaad rakhne ke liye
let usersMap = {};

export function initElanaatAndTasks(db) {
    
    // --- Helper Function: Custom Notifications ---
    const showLocalNotification = (msg, isError = false) => {
        const notif = document.getElementById('notification');
        if (notif) {
            notif.textContent = msg;
            notif.className = `fixed top-5 right-5 text-white py-2 px-4 rounded-lg shadow-lg z-[100] transition-transform transform ${isError ? 'bg-red-500' : 'bg-emerald-600'}`;
            notif.classList.remove('hidden', 'translate-x-full'); 
            setTimeout(() => notif.classList.add('translate-x-full'), 3000);
        } else {
            alert(msg);
        }
    };

    // ==========================================
    // 1. ELANAAT (ANNOUNCEMENTS) SYSTEM
    // ==========================================
    const setupElanaatSystem = () => {
        const elanaatForm = document.getElementById('elanaat-form');
        const elanaatTextarea = document.getElementById('elanaat-textarea');
        const elanaatListDiv = document.getElementById('elanaat-list');

        // Note: Aap apne HTML me ek checkbox laga sakte hain id="elaan-popup-cb"
        const popupCheckbox = document.getElementById('elaan-popup-cb'); 

        if (!elanaatForm || !elanaatTextarea || !elanaatListDiv) return;

        if (!elanaatForm.dataset.initialized) {
            elanaatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = elanaatTextarea.value.trim();
                if (!text) return;

                const isPopup = popupCheckbox ? popupCheckbox.checked : false;
                const submitBtn = elanaatForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerText;
                submitBtn.innerText = "Publishing...";
                submitBtn.disabled = true;

                try {
                    await addDoc(collection(db, "announcements"), {
                        text: text,
                        showAsPopup: isPopup, // Yeh flag user side par modal dikhane me madad karega
                        timestamp: serverTimestamp()
                    });
                    elanaatTextarea.value = "";
                    if(popupCheckbox) popupCheckbox.checked = false;
                    showLocalNotification("Elaan kamyabi se publish ho gaya!");
                } catch (err) {
                    console.error("Elaan Error:", err);
                    showLocalNotification("Elaan publish karne mein masla aaya.", true);
                } finally {
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                }
            });
            elanaatForm.dataset.initialized = "true";
        }

        // Live Elanaat List & Delete Logic
        const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
        onSnapshot(q, (snap) => {
            let html = '';
            snap.forEach(docSnap => {
                const d = docSnap.data();
                const date = d.timestamp ? d.timestamp.toDate().toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : 'Just now';
                
                html += `
                    <div class="p-4 bg-white border border-slate-200 rounded-xl mb-3 shadow-sm relative group transition-all hover:shadow-md">
                        ${d.showAsPopup ? '<span class="bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded-full font-bold mb-2 inline-block">POPUP ALERT</span>' : ''}
                        <p class="urdu-font text-lg text-slate-800 leading-relaxed pr-8">${d.text}</p>
                        <div class="text-[10px] font-bold text-slate-400 mt-3 flex items-center gap-1 uppercase tracking-wider">
                            <i class="far fa-clock"></i> ${date}
                        </div>
                        <button class="delete-elaan-btn absolute top-3 right-3 text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all" data-id="${docSnap.id}" title="Elaan Delete Karein">
                            <i class="fas fa-trash-alt text-sm"></i>
                        </button>
                    </div>`;
            });
            elanaatListDiv.innerHTML = html || '<p class="text-slate-400 text-sm text-center py-6 bg-slate-50 rounded-xl border border-slate-100">Abhi tak koi elaan maujood nahi.</p>';

            document.querySelectorAll('.delete-elaan-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const elaanId = e.currentTarget.dataset.id;
                    if(confirm("Kya aap waqai yeh elaan delete karna chahte hain?")) {
                        await deleteDoc(doc(db, 'announcements', elaanId));
                    }
                });
            });
        });
    };

    // ==========================================
    // 2. ADVANCED TASK MANAGEMENT SYSTEM
    // ==========================================
    const setupTaskSystem = () => {
        const taskTypeSelect = document.getElementById('task-type');
        const dynamicFieldsDiv = document.getElementById('dynamic-task-fields');
        const taskInput = document.getElementById('task-input');
        const assignTaskBtn = document.getElementById('assign-task-btn');
        const userCheckboxList = document.getElementById('user-checkbox-list');
        const adminTaskList = document.getElementById('admin-task-list');

        if (!taskInput || !assignTaskBtn || !userCheckboxList) return;

        // --- Dynamic Fields Logic ---
        if (taskTypeSelect && dynamicFieldsDiv) {
            taskTypeSelect.addEventListener('change', (e) => {
                const type = e.target.value;
                dynamicFieldsDiv.classList.remove('hidden');
                
                if (type === 'link') {
                    dynamicFieldsDiv.innerHTML = `<input type="url" id="task-url" class="w-full p-2 border rounded" placeholder="Google Form ya kisi bhi website ka link paste karein...">`;
                } else if (type === 'poll') {
                    dynamicFieldsDiv.innerHTML = `
                        <p class="text-xs text-gray-500 mb-2">Options comma (,) se alag kar ke likhein (e.g. Haan, Nahi, Shayad)</p>
                        <input type="text" id="task-poll-options" class="w-full p-2 border rounded" placeholder="Option 1, Option 2, Option 3">
                    `;
                } else if (type === 'checklist') {
                    dynamicFieldsDiv.innerHTML = `
                        <p class="text-xs text-gray-500 mb-2">Checklist items comma (,) se alag kar ke likhein</p>
                        <input type="text" id="task-checklist-items" class="w-full p-2 border rounded" placeholder="Item 1, Item 2, Item 3">
                    `;
                } else {
                    dynamicFieldsDiv.classList.add('hidden');
                    dynamicFieldsDiv.innerHTML = '';
                }
            });
        }

        // --- Load Users ---
        onSnapshot(collection(db, "users"), (snapshot) => {
            let html = `
                <label class="flex items-center gap-3 p-2 bg-slate-50 hover:bg-slate-100 rounded-md cursor-pointer border-b border-gray-200 mb-1">
                    <input type="checkbox" id="select-all-users-cb" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm font-bold text-gray-800">Sab Ko Select Karein</span>
                </label>
            `;
            snapshot.forEach((doc) => {
                const u = doc.data();
                if (u.role === 'admin') return; 
                usersMap[doc.id] = u.name || "Unknown";
                html += `
                    <label class="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer border-b border-gray-100">
                        <input type="checkbox" name="selected-users" value="${doc.id}" class="w-4 h-4 task-user-cb rounded text-indigo-600">
                        <span class="text-sm font-medium text-gray-700">${usersMap[doc.id]}</span>
                    </label>
                `;
            });
            userCheckboxList.innerHTML = html;

            const selectAllCb = document.getElementById('select-all-users-cb');
            if(selectAllCb) {
                selectAllCb.addEventListener('change', (e) => {
                    document.querySelectorAll('.task-user-cb').forEach(cb => cb.checked = e.target.checked);
                });
            }
        });

        // --- Assign Task Logic ---
        if (!assignTaskBtn.dataset.initialized) {
            assignTaskBtn.addEventListener('click', async () => {
                const taskText = taskInput.value.trim();
                const type = taskTypeSelect ? taskTypeSelect.value : 'text';
                const checkboxes = document.querySelectorAll('input[name="selected-users"]:checked');
                const selectedIds = Array.from(checkboxes).map(cb => cb.value);

                if(selectedIds.length === 0) { alert("Koi user select karein!"); return; }
                if(!taskText) { alert("Task ki tafseel likhein!"); return; }

                // Dynamic data collect karein
                let metaData = {};
                if (type === 'link') {
                    const urlVal = document.getElementById('task-url')?.value;
                    if(!urlVal) return alert("Link dena zaroori hai!");
                    metaData.url = urlVal;
                } else if (type === 'poll' || type === 'checklist') {
                    const inputVal = type === 'poll' ? document.getElementById('task-poll-options')?.value : document.getElementById('task-checklist-items')?.value;
                    if(!inputVal) return alert("Options dena zaroori hai!");
                    metaData.options = inputVal.split(',').map(item => item.trim());
                }

                try {
                    assignTaskBtn.disabled = true;
                    assignTaskBtn.innerHTML = 'Bheja ja raha hai...';

                    const promises = selectedIds.map(uid => addDoc(collection(db, "user_tasks"), {
                        userId: uid,
                        task: taskText,
                        type: type, // 'text', 'poll', 'link', 'checklist'
                        metaData: metaData, // Yahan poll options ya link save hoga
                        status: "pending",
                        timestamp: serverTimestamp()
                    }));
                    
                    await Promise.all(promises);
                    
                    // Reset Form
                    taskInput.value = "";
                    if(dynamicFieldsDiv) { dynamicFieldsDiv.innerHTML = ''; dynamicFieldsDiv.classList.add('hidden'); }
                    if(taskTypeSelect) taskTypeSelect.value = 'text';
                    checkboxes.forEach(cb => cb.checked = false);
                    document.getElementById('select-all-users-cb').checked = false;
                    
                    showLocalNotification("Tasks successfully assign ho gaye!");
                } catch (e) {
                    console.error(e);
                    showLocalNotification("Error aaya.", true);
                } finally {
                    assignTaskBtn.disabled = false;
                    assignTaskBtn.innerHTML = 'Send Task';
                }
            });
            assignTaskBtn.dataset.initialized = "true";
        }

        // --- Live Render Tasks ---
        const q = query(collection(db, "user_tasks"), orderBy("timestamp", "desc"));
        onSnapshot(q, (snap) => {
            const groupedTasks = {};
            snap.forEach(doc => {
                const d = doc.data();
                if (!groupedTasks[d.userId]) groupedTasks[d.userId] = [];
                groupedTasks[d.userId].push({ id: doc.id, ...d });
            });

            if(!adminTaskList) return;
            
            adminTaskList.innerHTML = Object.keys(groupedTasks).map(uid => {
                const userName = usersMap[uid] || "Unknown";
                const tasks = groupedTasks[uid];
                const pendingCount = tasks.filter(t => t.status !== 'done').length;
                
                return `
                    <div class="mb-4 border rounded-xl overflow-hidden bg-white">
                        <button onclick="this.nextElementSibling.classList.toggle('hidden')" 
                                class="w-full flex justify-between p-3 bg-indigo-50 font-bold text-indigo-800">
                            <span>${userName}</span>
                            <span class="bg-indigo-200 px-2 py-1 rounded text-xs">${pendingCount} Pending</span>
                        </button>
                        <div class="hidden p-3 space-y-2">
                            ${tasks.map(t => {
                                let typeBadge = t.type === 'poll' ? '📊 POLL' : t.type === 'link' ? '🔗 LINK' : t.type === 'checklist' ? '✅ LIST' : '📝 TEXT';
                                return `
                                    <div class="p-3 border rounded bg-slate-50 flex justify-between group">
                                        <div>
                                            <div class="flex gap-2 mb-1">
                                                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">${typeBadge}</span>
                                                <span class="text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${t.status.toUpperCase()}</span>
                                            </div>
                                            <p class="text-sm font-medium mt-1">${t.task}</p>
                                        </div>
                                        <button class="delete-task-btn text-red-400 hover:text-red-600 w-8 h-8 opacity-0 group-hover:opacity-100" data-id="${t.id}">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('') || '<p class="text-center py-4 text-gray-500">Koi task nahi.</p>';

            document.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const taskId = e.currentTarget.dataset.id;
                    if(confirm("Delete task?")) await deleteDoc(doc(db, "user_tasks", taskId));
                });
            });
        });
    };

    setupElanaatSystem();
    setupTaskSystem();
}
