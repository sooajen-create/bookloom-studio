const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token='@[\\w\\u3400-\\u9fff.-]+';
const header=new RegExp(`^(.+?)\\s+(${token})(?:\\s+回复\\s+(${token}|[^·|｜]+?))?(?:\\s*[·|｜]\\s*(.+))?$`);

export function parsePosts(lines,title=''){
 const entries=[];let current=null,nextRoot=false;
 const flush=()=>{if(current){entries.push(current);current=null}};
 for(const raw of lines){let line=raw.trim();
  if(/^==={1,}$/.test(line)){flush();nextRoot=true;continue}
  if(/^---+$/.test(line)){flush();continue}
  const forced=/^(?:主帖|微博)\s+/.test(line);if(forced)line=line.replace(/^(?:主帖|微博)\s+/,'');
  if(!current&&!line)continue;
  const modern=line.replace(/^评论\s+/,'').match(header),legacy=line.match(/^(\d+楼)\s*[·.、\s]\s*(.+)$/),inline=line.match(/^([^:：]{1,30}?)\s+回复\s+(@?[^:：\s]{1,30})[:：]\s*(.*)$/);
  if(modern||legacy||inline){flush();current={name:modern?modern[1].trim():legacy?legacy[2]:inline[1],handle:modern?modern[2]:'',time:modern?(modern[4]||''):legacy?legacy[1]:'',target:modern?(modern[3]?.trim()||''):inline?inline[2]:'',body:inline?[inline[3]]:[],stats:null,root:forced||nextRoot};nextRoot=false;continue}
  if(!current)current={name:title||'匿名',handle:'',time:'',target:'',body:[],stats:null,root:nextRoot};nextRoot=false;
  if(/^(?:回复|评论|转发|点赞|喜欢)\s*\d+.*(?:转发|喜欢|点赞|评论)/.test(line))current.stats={reply:line.match(/(?:回复|评论)\s*(\d+)/)?.[1]??'',repost:line.match(/转发\s*(\d+)/)?.[1]??'',like:line.match(/(?:喜欢|点赞)\s*(\d+)/)?.[1]??''};
  else {const reply=line.match(/^回复\s+(@?[^:：\s]{1,30})[:：]\s*(.*)$/);if(reply&&!current.target){current.target=reply[1];if(reply[2])current.body.push(reply[2])}else current.body.push(raw)}
 }flush();
 const roots=[];let active=null;
 for(const [order,entry] of entries.entries()){entry.replies=[];entry.order=order;
  if(!active||entry.root){entry.comments=[];roots.push(entry);active=entry;continue}
  // Look only within this post and choose the most recent matching person.
  // Replies to replies remain under their top-level comment, with the target
  // retained in the text instead of creating increasingly narrow columns.
  let parent=null;
  if(entry.target){const candidates=active.comments.flatMap(c=>[c,...c.replies]).sort((a,b)=>a.order-b.order);for(let i=candidates.length-1;i>=0;i--){const candidate=candidates[i];if(candidate.handle===entry.target||candidate.name===entry.target||candidate.name===entry.target.replace(/^@/,'')){parent=candidate;break}}}
  if(parent){const top=parent.parent||parent;entry.parent=top;top.replies.push(entry)}else active.comments.push(entry);
 }return roots;
}

export function renderPosts(lines,title=''){
 const roots=parsePosts(lines,title),avatar=p=>`<span class="weibo-avatar" aria-label="${esc(p.name)}的头像占位">${esc(Array.from(p.name.replace(/^@/,''))[0]||'人')}</span>`;
 const replyLabel=p=>p.target?`<span class="weibo-reply-to">回复 <span class="weibo-link">${esc(p.target.startsWith('@')?p.target:'@'+p.target)}</span>：</span>`:'';
 const body=p=>p.body.map(esc).join('<br/>');
 const nested=p=>`<div class="weibo-nested-reply"><span class="weibo-comment-name">${esc(p.name)}</span>：${replyLabel(p)}<span>${body(p)}</span>${p.time?`<div class="weibo-time">${esc(p.time)}</div>`:''}</div>`;
 const comment=p=>`<div class="weibo-comment">${avatar(p)}<div class="weibo-comment-body"><div><span class="weibo-comment-name">${esc(p.name)}</span>${p.handle?` <span class="weibo-handle">${esc(p.handle)}</span>`:''}</div><div class="weibo-comment-text">${replyLabel(p)}${body(p)}</div><div class="weibo-comment-meta"><span>${esc(p.time)}</span><span>回复${p.stats?.like!==undefined&&p.stats.like!==''?` · ♡ ${esc(p.stats.like)}`:''}</span></div>${p.replies.length?`<div class="weibo-subthread">${p.replies.map(nested).join('')}</div>`:''}</div></div>`;
 return `<div class="post-thread weibo-thread">${title?`<div class="weibo-topic">${esc(title)}</div>`:''}${roots.map(p=>`<div class="weibo-card"><div class="weibo-post"><div class="weibo-post-header">${avatar(p)}<div class="weibo-user"><span class="weibo-name">${esc(p.name)}</span>${p.handle?`<span class="weibo-handle">${esc(p.handle)}</span>`:''}${p.time?`<div class="weibo-time">${esc(p.time)}</div>`:''}</div><span class="weibo-more" aria-hidden="true">⌄</span></div><div class="weibo-text">${body(p)}</div><div class="weibo-actions"><span>⇄ ${esc(p.stats?.repost||'转发')}</span><span>▢ ${esc(p.stats?.reply||'评论')}</span><span>♡ ${esc(p.stats?.like||'赞')}</span></div></div>${p.comments.length?`<div class="weibo-comments"><div class="weibo-comments-title">评论</div>${p.comments.map(comment).join('')}</div>`:''}</div>`).join('')}</div>`;
}

export const postsCSS=`
.weibo-thread.post-thread{border:0;border-radius:0;background:transparent;color:#333;overflow:visible;font-family:sans-serif}.weibo-topic{font-size:.84em;color:#946537;padding:6px 2px 12px}.weibo-card{background:#fff;border:1px solid #e7e7e7;border-radius:9px;overflow:hidden;margin-bottom:18px;text-align:left;text-indent:0!important;writing-mode:horizontal-tb}.weibo-post{padding:18px 18px 0}.weibo-post-header{position:relative;min-height:43px;padding-left:53px}.weibo-avatar{position:absolute;left:0;top:0;width:40px;height:40px;line-height:40px;text-align:center;border-radius:50%;background:#f3dfc7;color:#92633c;font-size:.9em;font-weight:bold}.weibo-user{line-height:1.6}.weibo-name{font-weight:bold;color:#dc7b29;font-size:.94em}.weibo-user .weibo-handle{margin-left:8px}.weibo-handle{color:#999;font-size:.72em}.weibo-time{color:#999;font-size:.66em;line-height:1.8;margin-top:3px}.weibo-more{position:absolute;right:0;top:0;color:#999}.weibo-text{font-size:.95em;line-height:1.9;margin:18px 0;overflow-wrap:anywhere;white-space:pre-wrap}.weibo-actions{border-top:1px solid #eee;color:#777;font-size:.78em;padding:11px 0;text-align:center}.weibo-actions>span{display:inline-block;width:32%;border-right:1px solid #eee}.weibo-actions>span:last-child{border:0}.weibo-comments{border-top:1px solid #ececec;padding:12px 16px 5px}.weibo-comments-title{font-size:.77em;font-weight:bold;border-bottom:2px solid #f19b42;display:inline-block;padding-bottom:7px;margin-bottom:6px}.weibo-comment{position:relative;padding:13px 0 13px 42px;border-bottom:1px solid #f0f0f0}.weibo-comment:last-child{border:0}.weibo-comment>.weibo-avatar{top:15px;width:30px;height:30px;line-height:30px;font-size:.7em;background:#e7ebdd;color:#6c7a50}.weibo-comment-body{min-width:0}.weibo-comment-name{color:#b57332;font-weight:500;font-size:.83em}.weibo-comment-text{font-size:.87em;line-height:1.85;margin-top:4px;white-space:pre-wrap;overflow-wrap:anywhere}.weibo-comment-meta{font-size:.64em;color:#999;margin-top:7px;display:block}.weibo-comment-meta>span:last-child{float:right}.weibo-subthread{margin-top:10px;background:#f6f6f6;border-radius:4px;padding:4px 11px}.weibo-nested-reply{font-size:.85em;line-height:1.85;padding:9px 0;border-bottom:1px solid #e9e9e9;overflow-wrap:anywhere;white-space:pre-wrap}.weibo-nested-reply:last-child{border:0}.weibo-nested-reply .weibo-comment-name{font-size:1em}.weibo-reply-to{color:#888}.weibo-link{color:#ba7b3e}.weibo-nested-reply .weibo-time{font-size:.75em}
@media(max-width:480px){.weibo-post{padding:14px 12px 0}.weibo-comments{padding:9px 11px 4px}.weibo-comment{padding-left:35px}.weibo-subthread{padding:3px 8px}.weibo-post-header{padding-left:47px}}
`;
