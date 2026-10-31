/* Theme helper: mobile drawer for pages that have a sidebar. No app logic touched. */
document.addEventListener('DOMContentLoaded',function(){
  var aside=document.querySelector('aside');
  if(!aside)return;
  document.body.classList.add('has-drawer');
  var btn=document.createElement('button');
  btn.type='button';btn.className='drawer-btn';btn.setAttribute('aria-label','Menu kholein');
  btn.innerHTML='<i class="fas fa-bars"></i>';
  var scrim=document.createElement('div');scrim.className='drawer-scrim';
  function set(o){document.body.classList.toggle('drawer-open',o);}
  btn.onclick=function(){set(!document.body.classList.contains('drawer-open'));};
  scrim.onclick=function(){set(false);};
  aside.addEventListener('click',function(e){if(e.target.closest('button,a'))set(false);});
  document.body.appendChild(scrim);document.body.appendChild(btn);
});
