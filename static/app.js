let data=[],groups=[],me=null,selected=null,currentPage=1,currentReviews=[],reviewPage=1,reviewSort='newest';const $=id=>document.getElementById(id);const modal=$('modal');const icons={'麵食':'🍜','飯類':'🍱','輕食':'🥗','速食':'🍔'};const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,method='GET',body){let r=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});let d=await r.json();if(!r.ok)throw Error(d.error||'操作失敗');return d}
function toast(msg){$('toast').textContent=msg;$('toast').style.display='block';setTimeout(()=>$('toast').style.display='none',2600)}
function show(html){$('modalBody').innerHTML=html;if(!modal.open)modal.showModal();modal.scrollTop=0}

function getShopEmoji(r){
    let n = r.name || '';
    if(n.includes('麥當勞') || n.includes('漢堡')) return '🍔';
    if(n.includes('7-ELEVEN') || n.includes('全家')) return '🏪';
    if(n.includes('咖啡') || n.includes('Cafe')) return '☕';
    if(n.includes('茶')) return '🧋';
    if(n.includes('冰') || n.includes('甜品')) return '🍧';
    if(n.includes('咖哩')) return '🍛';
    if(n.includes('義大利麵')) return '🍝';
    if(n.includes('包子') || n.includes('四海遊龍') || n.includes('抄手')) return '🥟';
    if(n.includes('鍋')) return '🍲';
    if(n.includes('捲餅') || n.includes('Sandwich') || n.includes('早午餐') || n.includes('野餐')) return '🥪';
    if(n.includes('碳烤')) return '🍢';
    if(n.includes('蔬食')) return '🥗';
    if(n.includes('粥')) return '🥣';
    if(n.includes('牛肉') || n.includes('麵') || n.includes('越南') || n.includes('滷味')) return '🍜';
    if(n.includes('和食')) return '🍱';
    return icons[r.category] || '🍽️';
}

function areaGroup(a){
    a = a || '';
    if(a.includes('小吃部')) return '小吃部';
    if(a.includes('水木')) return '水木餐廳';
    if(a.includes('風雲')) return '風雲樓';
    return '其他';
}

function switchTab(tab){
    ['home','restaurants','groups'].forEach(t=>{
        if($('tab-'+t)) $('tab-'+t).hidden=(t!==tab);
    });
    document.querySelectorAll('.nav-btn').forEach(btn=>{
        btn.classList.toggle('active', btn.dataset.tab===tab);
    });
    window.scrollTo({top:0,behavior:'smooth'});
}

async function refresh(){
    data=(await api('restaurants')).filter(r=>!r.demo && !(r.name||'').includes('示範'));
    groups=await api('groups');
    me=(await api('me')).username;
    if($('count')) $('count').textContent=data.length;
    $('account').innerHTML=me?`<span class="muted">嗨，${esc(me)} </span><button class="authbtn" onclick="logout()">登出</button>`:`<button class="authbtn" onclick="authForm('login')">登入</button><button class="authbtn" onclick="authForm('register')">註冊</button>`;
    
    const prevGroup=$('groupFilter').value;
    $('groupFilter').innerHTML='<option value="">全部餐廳</option>'+groups.filter(g=>g.kind==='include').map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('');
    $('groupFilter').value=prevGroup;

    render();
    renderGroups();
}


function hasPrice(r){
    return Number.isFinite(r.price_min) &&
           Number.isFinite(r.price_max) &&
           r.price_min > 0 &&
           r.price_max >= r.price_min;
}

function formatPrice(r){
    if(!hasPrice(r)){
        return '價格待補充';
    }

    if(r.price_min === r.price_max){
        return `NT$ ${r.price_min}`;
    }

    return `NT$ ${r.price_min}～${r.price_max}`;
}

function filtered(ignoreSearch=false){
    let budget=+$('budget').value;
    let checkedAreas=[...document.querySelectorAll('input[name="area"]:checked')].map(el=>el.value);
    let checkedCats=[...document.querySelectorAll('input[name="category"]:checked')].map(el=>el.value);
    let kw=(!ignoreSearch && $('search'))?$('search').value.trim().toLowerCase():'';
    let group=groups.find(g=>String(g.id)===$('groupFilter').value);
    let exclusions=new Set($('exclude').checked?groups.filter(g=>g.kind==='exclude').flatMap(g=>g.items):[]);
    
    let list=data.filter(r=>
        (!hasPrice(r) || r.price_min <= budget) &&
        (!checkedCats.length || checkedCats.includes(r.category)) &&
        (!checkedAreas.length || checkedAreas.includes(areaGroup(r.area))) &&
        (!kw || r.name.toLowerCase().includes(kw) || areaGroup(r.area).toLowerCase().includes(kw) || (r.area||'').toLowerCase().includes(kw) || (r.description||'').toLowerCase().includes(kw)) &&
        (!group||group.items.includes(r.id)) &&
        !exclusions.has(r.id)
    );
    let sort=$('sort').value;
    if(sort==='price'){
        list.sort((a,b)=>{
            if(!hasPrice(a) && !hasPrice(b)) return 0;
            if(!hasPrice(a)) return 1;
            if(!hasPrice(b)) return -1;

            return a.price_min - b.price_min;
        });
    }
    if(sort==='rating')list.sort((a,b)=>(b.avg_rating||0)-(a.avg_rating||0));
    if(sort==='popular')list.sort((a,b)=>b.picks-a.picks);
    return list;
}

function render(){
    let list=filtered();
    let pageSize=$('pageSize')?(+$('pageSize').value||12):12;
    let totalPages=Math.max(1,Math.ceil(list.length/pageSize));
    if(currentPage>totalPages)currentPage=totalPages;
    if(currentPage<1)currentPage=1;
    let start=(currentPage-1)*pageSize;
    let pageList=list.slice(start,start+pageSize);

    $('budgetLabel').textContent='NT$ '+$('budget').value;
    $('resultCount').textContent=`找到 ${list.length} 家餐廳`;
    $('empty').hidden=!!list.length;
    $('cards').innerHTML=pageList.map(r=>`
        <article class="restaurant">
            <div class="food-icon">${getShopEmoji(r)}</div>
            <div class="restaurant-content">
                <h3>${esc(r.name)}</h3>
                <div class="tags">
                    <span class="tag">${esc(areaGroup(r.area))}</span>
                    <span class="tag">${esc(r.category)}</span>
                    <span class="tag">${formatPrice(r)}</span>
                    <span class="tag">${r.avg_rating?'★ '+r.avg_rating:'尚無評分'}</span>
                </div>
                <p>${esc(r.description)}</p>
                <div class="restaurant-bottom">
                    <b>${r.review_count} 則評價</b>
                    <button class="outline small" onclick="details(${r.id})">查看詳情 →</button>
                </div>
            </div>
        </article>
    `).join('');

    if($('pagination')){
        $('pagination').innerHTML=list.length?`
            <button class="outline small" onclick="changePage(-1)" ${currentPage<=1?'disabled':''}>← 上一頁</button>
            <span class="muted">第 ${currentPage} / ${totalPages} 頁</span>
            <button class="outline small" onclick="changePage(1)" ${currentPage>=totalPages?'disabled':''}>下一頁 →</button>
        `:'';
    }
}

function changePage(delta){
    currentPage+=delta;
    render();
    window.scrollTo({top:0,behavior:'smooth'});
}

function resetFilters(){
    $('budget').value=150;
    document.querySelectorAll('input[name="area"], input[name="category"]').forEach(el=>el.checked=false);
    if($('search')) $('search').value='';
    $('groupFilter').value='';
    $('exclude').checked=true;
    $('sort').value='default';
    if($('pageSize')) $('pageSize').value='12';
    currentPage=1;
    render();
}

async function randomPick(){
    let list=filtered(true);
    if(!list.length)return toast('沒有符合條件的餐廳');

    if(list.length === 1){
        let only = list[0];
        await api('pick/'+only.id,'POST');
        await refresh();
        return show(`
        <div style="text-align:center; padding: 15px 0;">
            <span class="eyebrow">ONLY ONE MATCH</span>
            <h2>今天就是它：<span style="color:var(--primary);">${getShopEmoji(only)} ${esc(only.name)}</span></h2>
            <p class="muted">目前篩選條件下只有這 1 家餐廳符合，不用轉盤直接吃！</p>
            <p class="muted">${esc(only.category)} · ${formatPrice(only)}</p>
            <button class="primary" onclick="modal.close();details(${only.id})">查看餐廳評價</button>
        </div>`);
    }

    let winner = list[Math.floor(Math.random()*list.length)];
    window.skipAnimation = false;

    let wheelItems = [winner];
    let otherList = list.filter(x => x.id !== winner.id);
    
    otherList.sort(() => Math.random() - 0.5);
    for(let i=0; i<7; i++) {
        if(otherList[i]) wheelItems.push(otherList[i]);
        else wheelItems.push(list[Math.floor(Math.random()*list.length)]); 
    }
    
    wheelItems.sort(() => Math.random() - 0.5);
    let winnerIndex = wheelItems.findIndex(x => x.id === winner.id);

    let colors = ['#ff9a9e', '#fecfef', '#a1c4fd', '#c2e9fb', '#d4fc79', '#96e6a1', '#cfd9df', '#e2ebf0'];
    let gradientStr = [];
    let labelsHTML = '';
    
    for(let i=0; i<8; i++) {
        let startAngle = i * 45; 
        gradientStr.push(`${colors[i]} ${startAngle}deg ${startAngle + 45}deg`);
        
        let textAngle = startAngle + 22.5 - 90;
        
        let shortName = esc(wheelItems[i].name);
        if(shortName.length > 6) shortName = shortName.substring(0,6) + '...';

        labelsHTML += `<div style="position:absolute; width:120px; text-align:right; left:50%; top:50%; transform-origin:0 50%; transform:translateY(-50%) rotate(${textAngle}deg); font-weight:bold; font-size:14px; padding-right:15px; color:#333; z-index:2;">${shortName}</div>`;
    }

    let randomOffset = (Math.random() - 0.5) * 44.98;
    let spinDegrees = 1800 - (winnerIndex * 45 + 22.5) + randomOffset;

    show(`
    <div style="text-align:center; position:relative; padding: 10px 0; overflow:hidden;">
        <button id="skipBtn" class="outline small" style="position:absolute; top:-10px; right:40px; z-index:10;" onclick="window.skipAnimation=true">⏭️ Skip</button>
        <span id="wheelEyebrow" class="eyebrow">WHEEL OF FORTUNE</span>
        <h2 id="wheelTitle" style="margin-bottom: 20px;">命運的轉盤...</h2>
        
        <div style="position:relative; width:260px; height:260px; margin:0 auto;">
            <div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:15px solid transparent; border-right:15px solid transparent; border-top:25px solid #ff4757; z-index:5;"></div>
            <div id="wheel" style="width:100%; height:100%; border-radius:50%; border:4px solid var(--primary); background: conic-gradient(${gradientStr.join(', ')}); transition: transform 3s cubic-bezier(0.2, 0.8, 0.1, 1); position:relative;">
                ${labelsHTML}
            </div>
        </div>
        
        <div id="wheelResult" style="margin-top: 15px; display: none;"></div>
    </div>`);

    setTimeout(() => {
        if($('wheel')) $('wheel').style.transform = `rotate(${spinDegrees}deg)`;
    }, 50);

    let checkSkip = setInterval(() => { if (window.skipAnimation) finish(); }, 100);
    let timer = setTimeout(finish, 3100);

    async function finish() {
        clearInterval(checkSkip);
        clearTimeout(timer);
        
        await api('pick/'+winner.id,'POST');
        await refresh();
        
        if($('skipBtn')) $('skipBtn').style.display = 'none'; 
        if($('wheelEyebrow')) $('wheelEyebrow').textContent = "🎉 TODAY'S PICK 🎉";
        if($('wheelTitle')) {
            $('wheelTitle').innerHTML = `今天吃：<span style="color:var(--primary);">${esc(winner.name)}</span>`;
        }
        
        if($('wheel') && window.skipAnimation) {
            $('wheel').style.transition = 'none';
            $('wheel').style.transform = `rotate(${spinDegrees}deg)`;
        }

        if($('wheelResult')) {
            $('wheelResult').style.display = 'block';
            $('wheelResult').innerHTML = `
                <p class="muted" style="margin-top:0;">${esc(winner.category)} · ${formatPrice(winner)}</p>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="primary" onclick="modal.close();details(${winner.id})">查看餐廳評價</button>
                    <button class="outline" onclick="modal.close();randomPick()">再抽一次</button>
                </div>
            `;
        }
    }
}

async function details(id){
    selected=id;
    let r=data.find(x=>x.id===id);
    currentReviews=await api('reviews/'+id);
    reviewPage=1;
    reviewSort='newest';
    
    let mapQuery = encodeURIComponent(r.name + " 國立清華大學");
    let mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

    show(`<span class="eyebrow">RESTAURANT DETAILS</span>
    <h2>${getShopEmoji(r)} ${esc(r.name)}</h2>
    <p>${esc(r.description)} · ${esc(r.area)}</p>
    
    <a href="${mapUrl}" target="_blank" class="outline small" style="margin-bottom: 15px; display: inline-block; text-decoration: none;">📍 在 Google Maps 查看位置</a>
    
    <div class="tags">
        <span class="tag">${esc(areaGroup(r.area))}</span>
        <span class="tag">${esc(r.category)}</span>
        <span class="tag">${formatPrice(r)}</span>
        <span class="tag">${r.avg_rating?'★ '+r.avg_rating:'尚無評分'}</span>
    </div>
    
    <h3>加入我的群組</h3>
    ${me?groups.map(g=>`<label class="group-option"><input type="checkbox" ${g.items.includes(id)?'checked':''} onchange="toggle(${g.id},${id})">${esc(g.name)} ${g.kind==='exclude'?'（排除）':''}</label>`).join('')||'<p>尚無群組</p>':'<p class="muted">登入後即可管理群組</p>'}
    
    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
        <h3 style="margin:0;">使用者評價 (${currentReviews.length})</h3>
        <select id="reviewSort" style="width:auto; padding:4px 8px; font-size:13px;" onchange="reviewSort=this.value;reviewPage=1;renderReviews()">
            <option value="newest">最新評價</option>
            <option value="likes">最多讚 👍</option>
        </select>
    </div>
    <div id="reviewsList" style="margin-top:10px;"></div>
    <div id="reviewsPager" style="display:flex; justify-content:center; align-items:center; gap:10px; margin:12px 0;"></div>
    
    ${me?`<h3>留下評價</h3><label class="field">星等 <b id="ratingLabel">5</b> / 5</label><input id="rating" type="range" min="1" max="5" step="1" value="5" oninput="ratingLabel.textContent=this.value"><label class="field">評論（選填）</label><textarea id="comment" rows="3" maxlength="500" placeholder="分享你的用餐經驗"></textarea><button class="primary full" onclick="submitReview(${id})">送出／更新我的評價</button>`:'<button class="outline full" onclick="authForm(\'login\')">登入後留下評價</button>'}`);

    renderReviews();
}

function renderReviews(){
    let list=[...currentReviews];
    if(reviewSort==='likes') list.sort((a,b)=>(b.likes-a.likes)||(b.id-a.id));
    else list.sort((a,b)=>b.id-a.id);

    let perPage=10;
    let totalPages=Math.max(1,Math.ceil(list.length/perPage));
    if(reviewPage>totalPages) reviewPage=totalPages;
    if(reviewPage<1) reviewPage=1;
    let pageList=list.slice((reviewPage-1)*perPage, reviewPage*perPage);

    $('reviewsList').innerHTML=pageList.map(v=>`
        <div class="review">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <b>${esc(v.username)} · ${'★'.repeat(v.rating)}${'☆'.repeat(5-v.rating)}</b>
                <button class="outline small" style="padding:2px 8px; font-size:12px; ${v.liked?'background:var(--primary,#163d31);color:#fff;':''}" onclick="toggleLike(${v.id})">👍 ${v.likes||0}</button>
            </div>
            <p>${esc(v.comment)}</p>
            <span class="muted">${esc(v.created_at)}</span>
        </div>
    `).join('') || '<p class="muted">還沒有人留下評價，來當第一位吧！</p>';

    $('reviewsPager').innerHTML=list.length>perPage?`
        <button class="outline small" onclick="reviewPage--;renderReviews()" ${reviewPage<=1?'disabled':''}>← 上一頁</button>
        <span class="muted" style="font-size:13px;">第 ${reviewPage} / ${totalPages} 頁</span>
        <button class="outline small" onclick="reviewPage++;renderReviews()" ${reviewPage>=totalPages?'disabled':''}>下一頁 →</button>
    `:'';
}

async function toggleLike(reviewId){
    if(!me) return toast('請先登入才能按讚');
    try{
        await api('reviews/'+reviewId+'/like','POST');
        currentReviews=await api('reviews/'+selected);
        renderReviews();
    }catch(e){toast(e.message)}
}

async function submitReview(id){try{await api('reviews/'+id,'POST',{rating:+$('rating').value,comment:$('comment').value});await refresh();await details(id);toast('評價已儲存')}catch(e){toast(e.message)}}
async function toggle(gid,id){try{await api('groups/'+gid+'/toggle','POST',{restaurant_id:id});await refresh();toast('群組已更新')}catch(e){toast(e.message)}}
function renderGroups(){$('groups').innerHTML=me?groups.map(g=>`<div class="group-card"><h3>${g.kind==='exclude'?'🚫':'💚'} ${esc(g.name)}</h3><p>${g.items.length} 家餐廳 · ${g.kind==='exclude'?'排除清單':'收藏清單'}</p><button class="outline small" onclick="manageGroup(${g.id})">管理餐廳</button> <button class="link" onclick="removeGroup(${g.id})">刪除</button></div>`).join('')||'<p>還沒有群組</p>':'<div class="group-card"><h3>建立你的專屬清單</h3><p>登入後可建立我的最愛、不吃清單，並與篩選器整合。</p><button class="outline" onclick="authForm(\'login\')">登入開始使用</button></div>'}
function manageGroup(id){let g=groups.find(x=>x.id===id);show(`<h2>${esc(g.name)}</h2><p class="muted">勾選想加入的餐廳，變更會立即儲存。</p>${data.map(r=>`<label class="group-option"><input type="checkbox" ${g.items.includes(r.id)?'checked':''} onchange="toggle(${id},${r.id})">${esc(r.name)}</label>`).join('')}`)}
function createGroup(){if(!me)return authForm('login');show('<h2>建立自訂群組</h2><label class="field">群組名稱</label><input id="newName" maxlength="40" placeholder="例如：下課想吃"><label class="field">群組用途</label><select id="newKind"><option value="include">收藏清單（可用於篩選）</option><option value="exclude">排除清單（不參與抽選）</option></select><button class="primary full" onclick="saveGroup()">建立</button>')}
async function saveGroup(){try{await api('groups','POST',{name:$('newName').value,kind:$('newKind').value});modal.close();await refresh();toast('群組建立成功')}catch(e){toast(e.message)}}
async function removeGroup(id){if(!confirm('確定刪除此群組？'))return;try{await api('groups/'+id,'DELETE');await refresh()}catch(e){toast(e.message)}}
function authForm(mode){show(`<h2>${mode==='login'?'歡迎回來':'加入清華吃'}</h2><p class="muted">此為原型帳號，請勿使用平常的重要密碼。</p><label class="field">帳號</label><input id="username" autocomplete="username" maxlength="32"><label class="field">密碼</label><input id="password" type="password" autocomplete="${mode==='login'?'current-password':'new-password'}"><button class="primary full" onclick="auth('${mode}')">${mode==='login'?'登入':'註冊'}</button><p class="muted">${mode==='login'?'還沒有帳號？':'已經有帳號？'} <button class="link" onclick="authForm('${mode==='login'?'register':'login'}')">${mode==='login'?'立即註冊':'前往登入'}</button></p>`)}
async function auth(mode){try{await api('auth/'+mode,'POST',{username:$('username').value,password:$('password').value});modal.close();await refresh();toast('歡迎使用清華吃')}catch(e){toast(e.message)}}
async function logout(){await api('auth/logout','POST',{});await refresh();toast('已登出')}

['search','budget','groupFilter','exclude','sort','pageSize'].forEach(id=>{
    if($(id)) $(id).addEventListener('input',()=>{currentPage=1;render()});
});
document.querySelectorAll('input[name="area"], input[name="category"]').forEach(el=>{
    el.addEventListener('change',()=>{currentPage=1;render()});
});
refresh().catch(e=>toast(e.message));

function showLeaderboard() {
    let sorted = [...data].sort((a, b) => {
        let scoreA = (a.avg_rating || 0) * 10 + (a.picks || 0);
        let scoreB = (b.avg_rating || 0) * 10 + (b.picks || 0);
        return scoreB - scoreA;
    });

    let top5 = sorted.slice(0, 5);

    let html = `<span class="eyebrow">TOP 5 LEADERBOARD</span>
    <h2>🏆 清華吃熱門排行榜</h2>
    <p class="muted">根據使用者評分與隨機抽選熱度計算</p>
    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
        ${top5.map((r, i) => `
        <div style="display: flex; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
            <div style="font-size: 28px; font-weight: 900; color: var(--primary); width: 40px;">#${i + 1}</div>
            <div style="flex: 1;">
                <h3 style="margin: 0; font-size: 16px;">${getShopEmoji(r)} ${esc(r.name)}</h3>
                <div class="muted" style="font-size: 13px; margin-top: 4px;">
                    ${r.avg_rating ? '★ ' + r.avg_rating : '尚無評分'} · 歷史熱度：${r.picks}
                </div>
            </div>
            <button class="outline small" onclick="details(${r.id})">查看</button>
        </div>
        `).join('')}
    </div>`;
    
    show(html);
}