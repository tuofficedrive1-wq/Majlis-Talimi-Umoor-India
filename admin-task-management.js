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

        if (!elanaatForm || !elanaatTextarea || !elanaatListDiv) return;

        // Form Submit (Sirf ek dafa event listener attach ho)
        if (!elanaatForm.dataset.initialized) {
            elanaatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const text = elanaatTextarea.value.trim();
                if (!text) return;

                const submitBtn = elanaatForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerText;
                submitBtn.innerText = "Publishing...";
                submitBtn.disabled = true;

                try {
                    await addDoc(collection(db, "announcements"), {
                        text: text,
                        timestamp: serverTimestamp()
                    });
                    elanaatTextarea.value = "";
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

            // Attach Delete Listeners (Secure Way)
            document.querySelectorAll('.delete-elaan-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const elaanId = e.currentTarget.dataset.id;
                    if(confirm("Kya aap waqai yeh elaan sabki screen se delete karna chahte hain?")) {
                        try {
                            await deleteDoc(doc(db, 'announcements', elaanId));
                            showLocalNotification("Elaan delete kar diya gaya.");
                        } catch(err) {
                            console.error(err);
                            showLocalNotification("Delete karne mein error aaya.", true);
                        }
                    }
                });
            });
        });
    };

    // ==========================================
    // 2. TASK MANAGEMENT SYSTEM
    // ==========================================
    const setupTaskSystem = () => {
        const taskInput = document.getElementById('task-input');
        const assignTaskBtn = document.getElementById('assign-task-btn');
        const userCheckboxList = document.getElementById('user-checkbox-list');
        const adminTaskList = document.getElementById('admin-task-list');

        if (!taskInput || !assignTaskBtn || !userCheckboxList || !adminTaskList) return;

        // A. Load Users for Checkboxes
        onSnapshot(collection(db, "users"), (snapshot) => {
            let html = `
                <label class="flex items-center gap-3 p-2 bg-slate-50 hover:bg-slate-100 rounded-md cursor-pointer border-b border-gray-200 mb-1 transition-colors">
                    <input type="checkbox" id="select-all-users-cb" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm font-bold text-gray-800">Sab Ko Select Karein</span>
                </label>
            `;
            
            snapshot.forEach((doc) => {
                const u = doc.data();
                if (u.role === 'admin') return; // Admin ko list me na dikhayen

                const userId = doc.id;
                const userName = u.name || "Unknown";
                usersMap[userId] = userName;

                html += `
                    <label class="flex items-center gap-3 p-2 hover:bg-white rounded-md cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
                        <input type="checkbox" name="selected-users" value="${userId}" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 task-user-cb">
                        <span class="text-sm font-medium text-gray-700 urdu-font">${userName} ${u.jamia ? '('+u.jamia+')' : ''}</span>
                    </label>
                `;
            });
            userCheckboxList.innerHTML = html || '<p class="text-gray-400 text-xs p-2">Koi user nahi mila.</p>';

            // Select All Logic
            const selectAllCb = document.getElementById('select-all-users-cb');
            if(selectAllCb) {
                selectAllCb.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    document.querySelectorAll('.task-user-cb').forEach(cb => cb.checked = isChecked);
                });
            }
        });

        // B. Assign Task Button Logic
        if (!assignTaskBtn.dataset.initialized) {
            assignTaskBtn.addEventListener('click', async () => {
                const taskText = taskInput.value.trim();
                const checkboxes = document.querySelectorAll('input[name="selected-users"]:checked');
                const selectedIds = Array.from(checkboxes).map(cb => cb.value);

                if(selectedIds.length === 0) { alert("Barahe karam kam se kam ek user select karein!"); return; }
                if(!taskText) { alert("Barahe karam task ki tafseel likhein!"); return; }

                try {
                    assignTaskBtn.disabled = true;
                    assignTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Bheja ja raha hai...';
                    assignTaskBtn.classList.add('opacity-70', 'cursor-not-allowed');

                    const promises = selectedIds.map(uid => addDoc(collection(db, "user_tasks"), {
                        userId: uid,
                        task: taskText,
                        status: "pending",
                        timestamp: serverTimestamp()
                    }));
                    await Promise.all(promises);

                    taskInput.value = "";
                    checkboxes.forEach(cb => cb.checked = false);
                    document.getElementById('select-all-users-cb').checked = false;
                    userCheckboxList.classList.add('hidden'); 
                    
                    showLocalNotification(`${selectedIds.length} logon ko task bhej diya gaya!`);
                } catch (e) {
                    console.error(e);
                    showLocalNotification("Task bhejne mein masla aaya.", true);
                } finally {
                    assignTaskBtn.disabled = false;
                    assignTaskBtn.innerHTML = 'Send Task';
                    assignTaskBtn.classList.remove('opacity-70', 'cursor-not-allowed');
                }
            });
            assignTaskBtn.dataset.initialized = "true";
        }

        // C. Live Render Tasks with Delete Button
        const q = query(collection(db, "user_tasks"), orderBy("timestamp", "desc"));
        onSnapshot(q, (snap) => {
            const groupedTasks = {};
            
            snap.forEach(doc => {
                const d = doc.data();
                const uid = d.userId;
                if (!groupedTasks[uid]) groupedTasks[uid] = [];
                groupedTasks[uid].push({ id: doc.id, ...d });
            });

            adminTaskList.innerHTML = Object.keys(groupedTasks).map(uid => {
                const userName = usersMap[uid] || "Unknown User";
                const tasks = groupedTasks[uid];
                const pendingCount = tasks.filter(t => t.status !== 'done').length;
                
                return `
                    <div class="mb-4 border rounded-xl overflow-hidden shadow-sm bg-white">
                        <button onclick="this.nextElementSibling.classList.toggle('hidden')" 
                                class="w-full flex justify-between items-center p-3 bg-indigo-50 hover:bg-indigo-100 transition font-bold text-indigo-800">
                            <span><i class="fas fa-user-circle mr-2"></i> ${userName}</span>
                            <div class="flex items-center gap-2">
                                ${pendingCount > 0 ? `<span class="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">${pendingCount} Pending</span>` : ''}
                                <span class="bg-indigo-200 text-indigo-800 text-xs px-2 py-1 rounded-full">${tasks.length} Total</span>
                            </div>
                        </button>
                        <div class="hidden p-3 space-y-2">
                            ${tasks.map(t => {
                                const cDate = t.timestamp ? t.timestamp.toDate().toLocaleString('en-IN', {day:'2-digit', month:'short'}) : '...';
                                return `
                                    <div class="p-3 border border-slate-100 rounded-lg bg-slate-50 flex justify-between group hover:border-slate-300 transition-colors">
                                        <div class="flex-1 pr-4">
                                            <div class="flex items-center gap-2 mb-1">
                                                <span class="text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                                                    ${t.status === 'done' ? '<i class="fas fa-check mr-1"></i> DONE' : '<i class="fas fa-clock mr-1"></i> PENDING'}
                                                </span>
                                                <span class="text-[10px] text-gray-400 font-bold"><i class="fas fa-paper-plane mr-1"></i> ${cDate}</span>
                                            </div>
                                            <p class="urdu-font font-medium text-gray-800 text-sm leading-relaxed mt-1">${t.task}</p>
                                        </div>
                                        <button class="delete-task-btn text-red-400 hover:text-red-600 hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100" data-id="${t.id}" title="Task Delete Karein">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('') || '<p class="text-center text-gray-500 py-6 bg-slate-50 rounded-xl border border-slate-100">Abhi tak koi task assign nahi kiya gaya.</p>';

            // Task Delete Listeners
            document.querySelectorAll('.delete-task-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const taskId = e.currentTarget.dataset.id;
                    if(confirm("Kya aap waqai is task ko delete karna chahte hain?")) {
                        try {
                            await deleteDoc(doc(db, "user_tasks", taskId));
                            showLocalNotification("Task delete kar diya gaya.");
                        } catch(err) {
                            console.error(err);
                            showLocalNotification("Delete karne mein masla aaya.", true);
                        }
                    }
                });
            });
        });
    };

    // Dono systems ko chalayen
    setupElanaatSystem();
    setupTaskSystem();
}