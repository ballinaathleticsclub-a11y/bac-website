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

  /* ── Reveal on scroll ── */
  var rm=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var els=document.querySelectorAll('.reveal');
  if(rm||!('IntersectionObserver'in window)){
    els.forEach(function(el){el.classList.add('in');});
  } else {
    var io=new IntersectionObserver(function(en){
      en.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
    },{threshold:.12});
    els.forEach(function(el){io.observe(el);});
  }

  /* ════════════════════════════════════════════════════════════
     LIVE RESULTS — reads straight from the handicap app's API.
     Guard on element existence so this only runs on pages that
     include a results container (#rbody).
     Change APP_URL to https://season.ballinaathletics.club once
     that subdomain is pointed at the Vercel app.
     ════════════════════════════════════════════════════════════ */
  var APP_URL='https://bac-handicap.vercel.app';

  var rbody=document.getElementById('rbody');
  if(!rbody)return; /* not a results page — stop here */

  var weekline=document.getElementById('results-weekline');
  var filter=document.getElementById('dist-filter');
  var allResults=[],latestWeek=null,curDist='all';

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
  function stateRow(html){rbody.innerHTML='<tr><td colspan="4" class="rstate">'+html+'</td></tr>';}

  function render(){
    if(!allResults.length){return;}
    var rows=allResults.filter(function(r){return r.week===latestWeek;});
    if(curDist!=='all'){rows=rows.filter(function(r){return Number(r.distance)===Number(curDist);});}
    rows.sort(function(a,b){
      if(a.distance!==b.distance)return a.distance-b.distance;
      if((b.points||0)!==(a.points||0))return(b.points||0)-(a.points||0);
      return String(a.finishTime).localeCompare(String(b.finishTime));
    });
    if(!rows.length){stateRow('No '+(curDist==='all'?'':curDist+'K ')+'runners recorded for this week.');return;}
    rbody.innerHTML=rows.map(function(r){
      return '<tr>'+
        '<td class="r-name">'+esc(r.name)+'</td>'+
        '<td class="r-dist">'+esc(r.distance)+'K</td>'+
        '<td class="num">'+esc(r.finishTime)+'</td>'+
        '<td class="num r-pts">'+esc(r.points)+'</td>'+
      '</tr>';
    }).join('');
  }

  if(filter){
    filter.addEventListener('click',function(e){
      var b=e.target.closest('.chip');if(!b)return;
      curDist=b.getAttribute('data-d');
      filter.querySelectorAll('.chip').forEach(function(c){c.classList.toggle('is-on',c===b);});
      render();
    });
  }

  fetch(APP_URL+'/api/data?type=results')
    .then(function(resp){if(!resp.ok)throw new Error('HTTP '+resp.status);return resp.json();})
    .then(function(data){
      allResults=Array.isArray(data)?data:[];
      if(!allResults.length){
        stateRow('Results will appear here the morning after the first race of the season.');
        if(weekline)weekline.textContent='';
        return;
      }
      latestWeek=allResults.reduce(function(m,r){return Math.max(m,r.week||0);},0);
      var first=allResults.filter(function(r){return r.week===latestWeek;})[0];
      if(weekline)weekline.textContent='Showing week '+latestWeek+(first&&first.date?' · '+fmtDate(first.date):'');
      render();
    })
    .catch(function(){
      stateRow('Couldn’t load this week’s results just now. <a href="'+APP_URL+'/results.html" target="_blank" rel="noopener">View them in the season app &rsaquo;</a>');
      if(weekline)weekline.textContent='';
    });

})();
