(function(){
  'use strict';

  /* ── Mobile nav toggle ── */
  var t=document.getElementById('navtoggle'),n=document.getElementById('nav');
  if(t&&n){
    t.addEventListener('click',function(){
      var open=n.classList.toggle('open');
      t.setAttribute('aria-expanded',open?'true':'false');
    });
    n.addEventListener('click',function(e){
      if(e.target.classList.contains('navlink')){
        n.classList.remove('open');
        t.setAttribute('aria-expanded','false');
      }
    });
  }

  /* ── Dropdown nav ── */
  var dropItems=document.querySelectorAll('.nav-item.has-drop');

  function openDrop(item){
    item.classList.add('is-open');
    item.querySelector('.nav-drop-toggle').setAttribute('aria-expanded','true');
  }
  function closeDrop(item){
    item.classList.remove('is-open');
    item.querySelector('.nav-drop-toggle').setAttribute('aria-expanded','false');
  }
  function closeAll(except){
    dropItems.forEach(function(item){if(item!==except)closeDrop(item);});
  }

  dropItems.forEach(function(item){
    var toggle=item.querySelector('.nav-drop-toggle');
    var drop=item.querySelector('.nav-drop');

    /* Click toggle */
    toggle.addEventListener('click',function(e){
      e.stopPropagation();
      var isMobile=window.innerWidth<=760;
      if(isMobile){
        var wasOpen=item.classList.contains('is-open');
        closeAll(null);
        if(!wasOpen)openDrop(item);
      } else {
        var wasOpen2=item.classList.contains('is-open');
        closeAll(null);
        if(!wasOpen2)openDrop(item);
      }
    });

    /* Hover (desktop only) */
    item.addEventListener('mouseenter',function(){
      if(window.innerWidth>760){closeAll(item);openDrop(item);}
    });
    item.addEventListener('mouseleave',function(){
      if(window.innerWidth>760)closeDrop(item);
    });

    /* Keyboard: arrow down / enter from toggle opens drop */
    toggle.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'||e.key==='Enter'||e.key===' '){
        e.preventDefault();
        openDrop(item);
        var first=drop.querySelector('a');
        if(first)first.focus();
      }
      if(e.key==='Escape'){closeDrop(item);toggle.focus();}
    });

    /* Keyboard: arrows within drop, Escape closes */
    drop.addEventListener('keydown',function(e){
      var links=Array.from(drop.querySelectorAll('a'));
      var idx=links.indexOf(document.activeElement);
      if(e.key==='ArrowDown'){e.preventDefault();if(idx<links.length-1)links[idx+1].focus();}
      if(e.key==='ArrowUp'){e.preventDefault();if(idx>0)links[idx-1].focus();else{closeDrop(item);toggle.focus();}}
      if(e.key==='Escape'){closeDrop(item);toggle.focus();}
      if(e.key==='Tab'){closeDrop(item);}
    });
  });

  /* Escape closes all */
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeAll(null);});
  /* Outside click closes all */
  document.addEventListener('click',function(){closeAll(null);});

  /* ── Year ── */
  var y=document.getElementById('year');if(y)y.textContent=new Date().getFullYear();

  /* ════════════════════════════════════════════════════════════
     LIVE RESULTS — reads straight from the handicap app's API.
     Guard on element existence so this only runs on pages that
     include a results section (#rbody).
     ════════════════════════════════════════════════════════════ */
  var APP_URL='https://bac-handicap.vercel.app';
  var PUBLIC_RESULTS='https://season.ballinaathletics.club/results.html';

  var rbody=document.getElementById('rbody');
  if(!rbody)return; /* not a results page — stop here */

  /* ── Helpers ── */
  var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso){
    if(!iso)return'';
    var p=iso.split('-');
    var d=new Date(+p[0],+p[1]-1,+p[2]);
    return DAYS[d.getDay()]+' '+(+p[2])+' '+MON[+p[1]-1]+' '+p[0];
  }
  function esc(s){
    return String(s==null?'':s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});
  }
  function setHtml(id,html){var el=document.getElementById(id);if(el)el.innerHTML=html;}
  function msg(id,cls,txt){setHtml(id,'<div class="'+cls+'">'+txt+'</div>');}

  /* ── Tabs ── */
  var tabBtns=rbody.querySelectorAll('.tab-btn');
  var tabPanels=rbody.querySelectorAll('.tab-panel');
  tabBtns.forEach(function(btn){
    btn.addEventListener('click',function(){
      tabBtns.forEach(function(b){b.classList.remove('is-active');b.setAttribute('aria-selected','false');});
      tabPanels.forEach(function(p){p.classList.remove('is-active');p.hidden=true;});
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected','true');
      var panel=document.getElementById(btn.getAttribute('aria-controls'));
      if(panel){panel.classList.add('is-active');panel.hidden=false;}
    });
  });

  /* ── Results data ── */
  var allResults=[];
  var weekSel=document.getElementById('week-sel');
  var distSel=document.getElementById('dist-sel');

  function renderResults(){
    if(!allResults.length){
      msg('results-out','r-empty','Results will appear here the morning after the first race of the season.');
      return;
    }
    var week=weekSel?parseInt(weekSel.value,10):null;
    var dist=distSel?distSel.value:'';
    var rows=allResults.filter(function(r){
      if(week&&r.week!==week)return false;
      if(dist&&String(r.distance)!==dist)return false;
      return true;
    });
    rows.sort(function(a,b){
      if(a.distance!==b.distance)return a.distance-b.distance;
      return String(a.finishTime||'').localeCompare(String(b.finishTime||''));
    });
    if(!rows.length){
      msg('results-out','r-empty','No results for the selected filters.');
      return;
    }
    var html='<div class="r-table-wrap"><table class="r-table"><thead><tr>'+
      '<th>Place</th><th>Name</th><th>Dist</th><th>Start</th><th>Finish</th><th>Pts</th>'+
      '</tr></thead><tbody>'+
      rows.map(function(r){
        return '<tr>'+
          '<td class="placing">'+esc(r.placing||'-')+'</td>'+
          '<td class="name">'+esc(r.name)+'</td>'+
          '<td class="dist-'+esc(r.distance)+'">'+esc(r.distance)+'K</td>'+
          '<td>'+esc(r.handicap?r.handicap+'\'':'--')+'</td>'+
          '<td>'+esc(r.finishTime||'--')+'</td>'+
          '<td>'+esc(r.points||'-')+'</td>'+
          '</tr>';
      }).join('')+
      '</tbody></table></div>';
    setHtml('results-out',html);
  }

  if(weekSel)weekSel.addEventListener('change',renderResults);
  if(distSel)distSel.addEventListener('change',renderResults);

  /* ── Handicaps data ── */
  var allHandicaps=[];
  var hcapFilt=document.getElementById('hcap-filter');
  var hcapDist='';

  function renderHandicaps(){
    var rows=allHandicaps.filter(function(r){
      return hcapDist===''||String(r.distance)===hcapDist;
    });
    rows.sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''));});
    if(!rows.length){
      msg('handicaps-out','r-empty','No handicaps found for the selected distance.');
      return;
    }
    var html='<div class="r-table-wrap"><table class="r-table"><thead><tr>'+
      '<th>Name</th><th>Dist</th><th>Handicap</th><th>Updated</th>'+
      '</tr></thead><tbody>'+
      rows.map(function(r){
        return '<tr>'+
          '<td class="name">'+esc(r.name)+'</td>'+
          '<td class="dist-'+esc(r.distance)+'">'+esc(r.distance)+'K</td>'+
          '<td style="font-family:var(--mono)">'+esc(r.handicap||'--')+'\'</td>'+
          '<td style="font-family:var(--mono);font-size:.8rem">'+esc(r.lastUpdated?fmtDate(r.lastUpdated):'--')+'</td>'+
          '</tr>';
      }).join('')+
      '</tbody></table></div>';
    setHtml('handicaps-out',html);
  }

  if(hcapFilt){
    hcapFilt.addEventListener('click',function(e){
      var btn=e.target.closest('.hcap-btn');if(!btn)return;
      hcapFilt.querySelectorAll('.hcap-btn').forEach(function(b){b.classList.remove('active');});
      btn.classList.add('active');
      hcapDist=btn.getAttribute('data-dist')||'';
      renderHandicaps();
    });
  }

  /* ── Monthly prizes data ── */
  function renderMonthly(data){
    if(!data||!data.length){
      msg('monthly-out','r-empty','Monthly prize leaders will appear here once enough races have been run this season.');
      return;
    }
    var html='<div class="r-table-wrap"><table class="r-table"><thead><tr>'+
      '<th>Month</th><th>Name</th><th>Distance</th><th>Points</th>'+
      '</tr></thead><tbody>'+
      data.map(function(r){
        return '<tr>'+
          '<td style="font-family:var(--mono)">'+esc(r.month||r.period||'--')+'</td>'+
          '<td class="name">'+esc(r.name||'--')+'</td>'+
          '<td>'+esc(r.distance?r.distance+'K':'--')+'</td>'+
          '<td>'+esc(r.points||'--')+'</td>'+
          '</tr>';
      }).join('')+
      '</tbody></table></div>';
    setHtml('monthly-out',html);
  }

  /* ── Fetch everything in parallel ── */
  var p1=fetch(APP_URL+'/api/data?type=results')
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(data){
      allResults=Array.isArray(data)?data:[];
      /* Populate week selector */
      if(weekSel){
        var weeks=[];
        allResults.forEach(function(r){if(r.week&&weeks.indexOf(r.week)<0)weeks.push(r.week);});
        weeks.sort(function(a,b){return b-a;});
        weekSel.innerHTML=weeks.map(function(w){
          var first=allResults.filter(function(r){return r.week===w;})[0];
          var label='Week '+w+(first&&first.date?' – '+fmtDate(first.date):'');
          return '<option value="'+w+'">'+esc(label)+'</option>';
        }).join('');
        if(!weeks.length)weekSel.innerHTML='<option>No races yet</option>';
      }
      renderResults();
    })
    .catch(function(){
      msg('results-out','r-error','Could not load results. <a href="'+esc(PUBLIC_RESULTS)+'" target="_blank" rel="noopener">View in the season app &rsaquo;</a>');
    });

  var p2=fetch(APP_URL+'/api/data?type=handicaps')
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(data){
      allHandicaps=Array.isArray(data)?data:[];
      renderHandicaps();
    })
    .catch(function(){
      msg('handicaps-out','r-error','Could not load handicaps. <a href="'+esc(PUBLIC_RESULTS)+'" target="_blank" rel="noopener">View in the season app &rsaquo;</a>');
    });

  var p3=fetch(APP_URL+'/api/data?type=monthly-prizes')
    .then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(data){renderMonthly(Array.isArray(data)?data:[]);})
    .catch(function(){
      msg('monthly-out','r-error','Could not load monthly prizes. <a href="'+esc(PUBLIC_RESULTS)+'" target="_blank" rel="noopener">View in the season app &rsaquo;</a>');
    });

})();
