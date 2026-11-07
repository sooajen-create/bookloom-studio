const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initial=name=>escape(Array.from(name.replace(/^@/,''))[0]||'人');

export function renderChat(lines,title='对话'){
 const parts=title.split('|'),selfOption=parts.find(s=>/^我=/.test(s));
 const parsed=lines.filter(l=>l.trim()).map(raw=>{
  const line=raw.trim();
  if(/^(?:旁白|动作|神态|叙述)[:：]/.test(line))return {narration:line.replace(/^[^:：]+[:：]\s*/,'')};
  if(/^[（(【]/.test(line))return {narration:line};
  const timed=line.match(/^([^\[\]\n]{1,40}?)\s*\[(\d{1,2}:\d{2})\]\s*[:：]\s*(.*)$/);
  if(timed)return {name:timed[1].trim(),time:timed[2],text:timed[3]};
  const m=line.match(/^([^:：\n]{1,40})[:：]\s*(.*)$/);
  return m?{name:m[1].trim(),time:'',text:m[2]}:{narration:line};
 });
 const speakers=[...new Set(parsed.filter(p=>p.name).map(p=>p.name))];
 const self=selfOption?selfOption.slice(2).trim():speakers.find(n=>/^(我|本人)$/.test(n))||speakers[1];
 const rows=parsed.map(p=>{
  if(p.narration!==undefined)return `<div class="chat-narration">${escape(p.narration)}</div>`;
  const right=p.name===self;
  return `<div class="chat-message${right?' is-self':''}"><div class="chat-name">${escape(p.name)}</div><div class="bubble${right?' right':''}"><span class="bubble-text">${escape(p.text)}</span><svg class="bubble-tail" xmlns="http://www.w3.org/2000/svg" width="14" height="11" viewBox="0 0 14 11" aria-hidden="true"><path d="M0 0 L2 9 L14 0" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg></div></div>`;
 }).join('');
 return `<div class="chat-block"><div class="chat-messages">${rows}</div></div>`;
}

export function renderPosts(lines,title='帖子'){
 const posts=[];let post=null;
 const flush=()=>{if(post){posts.push(post);post=null}};
 for(const raw of lines){const line=raw.trim();
  if(/^---+$/.test(line)){flush();continue}
  const modern=line.match(/^(.+?)\s+(@[\w\u3400-\u9fff.-]+)(?:\s*[·|｜]\s*(.+))?$/);
  const legacy=line.match(/^(\d+楼)\s*[·.、\s]\s*(.+)$/);
  if(modern||legacy){flush();post={name:modern?modern[1]:legacy[2],handle:modern?modern[2]:'',time:modern?(modern[3]||''):legacy[1],body:[],stats:null};continue}
  if(!post)post={name:title||'帖子',handle:'',time:'',body:[],stats:null};
  if(/^(?:回复|评论)\s*\d+.*(?:转发|喜欢|点赞)/.test(line)){
   post.stats={reply:line.match(/(?:回复|评论)\s*(\d+)/)?.[1]||'',repost:line.match(/转发\s*(\d+)/)?.[1]||'',like:line.match(/(?:喜欢|点赞)\s*(\d+)/)?.[1]||''};
  }else post.body.push(raw);
 }
 flush();
 return `<div class="post-thread">${title?`<div class="post-thread-title">${escape(title)}</div>`:''}${posts.map(p=>`<div class="tweet"><span class="tweet-avatar" aria-label="${escape(p.name)}的头像占位">${initial(p.name)}</span><div class="tweet-main"><div class="tweet-header"><span class="tweet-name">${escape(p.name)}</span>${p.handle?`<span class="tweet-handle">${escape(p.handle)}</span>`:''}${p.time?`<span class="tweet-time">· ${escape(p.time)}</span>`:''}<span class="tweet-more" aria-hidden="true">···</span></div><div class="tweet-text">${p.body.map(escape).join('<br/>')}</div><div class="tweet-actions"><span>↩ <span>${p.stats?.reply||'回复'}</span></span><span>⇄ <span>${p.stats?.repost||'转发'}</span></span><span>♡ <span>${p.stats?.like||'喜欢'}</span></span><span aria-label="分享图标">↥</span></div></div></div>`).join('')}</div>`;
}

export function renderLetter(lines,title='信件'){
 let salutation='',signature='',date='';const body=[];
 for(const line of lines){const m=line.match(/^(称呼|落款|日期)[:：]\s*(.*)$/);if(m){if(m[1]==='称呼')salutation=m[2];if(m[1]==='落款')signature=m[2];if(m[1]==='日期')date=m[2]}else body.push(line)}
 const paragraphs=body.join('\n').trim().split(/\n\s*\n/).filter(Boolean);
 return `<div class="letter-paper">${title?`<div class="letter-heading">${escape(title)}</div>`:''}${salutation?`<div class="letter-salutation">${escape(salutation)}</div>`:''}<div class="letter-body">${paragraphs.map(p=>`<div class="letter-paragraph">${p.split('\n').map(escape).join('<br/>')}</div>`).join('')}</div>${signature||date?`<div class="letter-signature">${escape(signature)}${signature&&date?'<br/>':''}${escape(date)}</div>`:''}</div>`;
}

// Shared by browser preview and EPUB output. Layout uses block/inline-block
// fallbacks so reflowable readers do not depend on grid or JavaScript.
export function componentCSS(ink=false){return `
.chat-block,.post-thread,.letter-paper{writing-mode:horizontal-tb;text-align:left;letter-spacing:normal;font-style:normal;text-indent:0!important;line-height:1.6;clear:both}
.chat-block{background:transparent;color:inherit;border:0;border-radius:0;margin:1.5em 0;overflow:visible;font-family:inherit}
.chat-messages{padding:0 2px}.chat-message{display:block;margin:20px 0 26px;padding:0;text-align:left;clear:both}.chat-message.is-self{text-align:right;padding:0}.chat-name{font-size:.73em;line-height:1.6;margin:0 0 6px;color:inherit;opacity:.7;text-indent:0!important;overflow-wrap:anywhere}.is-self .chat-name{text-align:right}.chat-block .bubble{display:inline-block;position:relative;vertical-align:top;max-width:82%;width:auto;background:transparent!important;color:inherit;border:1.25px solid currentColor;border-bottom:0;border-radius:7px;padding:11px 16px 12px;margin:0!important;box-shadow:none;font-size:.95em;line-height:1.8;text-indent:0!important;text-align:left;overflow-wrap:anywhere;white-space:pre-wrap}.chat-block .bubble.right{background:transparent!important;color:inherit;border-radius:7px}.chat-block .bubble:before,.chat-block .bubble:after{content:"";position:absolute;bottom:0;border-bottom:1.25px solid currentColor;height:6px;pointer-events:none}.chat-block .bubble:before{left:-1.25px;width:19.25px;border-left:1.25px solid currentColor;border-bottom-left-radius:7px}.chat-block .bubble:after{left:32px;right:-1.25px;border-right:1.25px solid currentColor;border-bottom-right-radius:7px}.chat-block .bubble.right:before{left:-1.25px;width:auto;right:32px}.chat-block .bubble.right:after{left:auto;right:-1.25px;width:19.25px}.bubble-tail{position:absolute;left:18px;bottom:-9.75px;width:14px;height:11px;overflow:visible;color:inherit}.right .bubble-tail{left:auto;right:18px;transform:scaleX(-1)}.chat-narration{font-size:.72em;color:#858585;text-align:center;padding:9px 8px;line-height:1.9;clear:both;text-indent:0!important}
.post-thread{background:#fff;color:#0f1419;border:1px solid #e5e9ec;border-radius:14px;overflow:hidden;margin:1.5em 0;font-family:sans-serif}.post-thread-title{padding:13px 17px;font-size:.85em;font-weight:bold;border-bottom:1px solid #eff3f4}.tweet{position:relative;padding:17px 15px 15px 66px;border-bottom:1px solid #eff3f4;break-inside:auto}.tweet:last-child{border-bottom:0}.tweet-avatar{position:absolute;left:14px;top:17px;width:39px;height:39px;line-height:39px;text-align:center;border-radius:50%;background:#dcebf3;color:#44718d;font-weight:bold;font-size:.9em}.tweet-header{font-size:.78em;line-height:1.6;padding-right:15px;overflow-wrap:anywhere}.tweet-name{font-weight:bold;margin-right:5px}.tweet-handle,.tweet-time{color:#536471;margin-right:5px}.tweet-more{position:absolute;right:13px;top:16px;color:#536471;letter-spacing:1px}.tweet-text{font-size:.91em;line-height:1.75;padding:7px 0 12px;overflow-wrap:anywhere;white-space:pre-wrap}.tweet-actions{color:#647581;font-size:.75em;white-space:nowrap}.tweet-actions>span{display:inline-block;width:27%}.tweet-actions>span:last-child{width:15%;text-align:right}.tweet-actions span span{font-size:.85em}
.letter-paper{color:#51432f;background-color:#fffbed;background-image:radial-gradient(ellipse at center,#fffef8 35%,#f9f1d7 76%,#d0b578 100%);border:1px solid #cbb582;border-top:3px solid #c4aa70;border-bottom:3px solid #bfa56b;border-radius:2px 5px 2px 4px;padding:30px 28px;margin:2em 6px;box-shadow:inset 0 0 24px #b38e4550,3px 5px 0 #dac99e,5px 8px 13px #493a2720;font-family:serif;position:relative}.letter-heading{text-align:center;font-size:.7em;letter-spacing:.3em;color:#9b875d;margin-bottom:24px}.letter-salutation{text-align:left;margin:0 0 1.4em;font-size:.95em}.letter-paragraph{margin:0 0 1em;text-indent:2em;line-height:2.1;overflow-wrap:anywhere}.letter-signature{text-align:right;margin-top:2em;line-height:2.1;font-size:.9em}
${ink?`.chat-block{background:transparent;color:#111}.chat-block .bubble{background:transparent!important;color:#111;box-shadow:none}.chat-narration{color:#666}.tweet-avatar{background:#ddd;color:#333}.post-thread{border-color:#999}.tweet-handle,.tweet-time,.tweet-actions{color:#555}.letter-paper{background:#fafafa;background-image:none;color:#111;box-shadow:none;border:1px solid #888}.letter-heading{color:#666}`:''}
@media(max-width:480px){.chat-messages{padding:0}.chat-message{padding:0}.chat-block .bubble{max-width:88%;padding:10px 13px 12px}.tweet{padding-left:53px;padding-right:11px}.tweet-avatar{left:10px;width:32px;height:32px;line-height:32px}.tweet-header{font-size:.72em}.letter-paper{padding:24px 19px;margin-left:0;margin-right:4px}}
`;}
