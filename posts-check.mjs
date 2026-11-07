import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parsePosts,renderPosts} from './dist/posts.mjs';
import {newBook,makeEpub,blocksToHTML,bookCSS} from './dist/core.mjs';
const text=`主帖 小林 @xiaolin · 10月12日 09:41
今天收到一封山间来信。你有没有写过信给未来的自己？
评论 3 · 转发 2 · 点赞 12
---
阿青 @aqing · 10月12日 09:42
有些故事，走回来才能读懂。
---
陈舟 @chenzhou 回复 @aqing · 10月12日 09:43
你也收到过这样的信吗？
---
阿青 @aqing 回复 @chenzhou · 10月12日 09:44
收到过，一直留到现在。
---
山客 @hiker · 10月12日 09:45
我也想给未来写一封信。`;
const roots=parsePosts(text.split('\n'));
assert.equal(roots.length,1);assert.equal(roots[0].stats.reply,'3');assert.equal(roots[0].stats.like,'12');assert.equal(roots[0].comments.length,2);assert.equal(roots[0].comments[0].replies.length,2);assert.equal(roots[0].comments[0].replies[1].target,'@chenzhou');assert.equal(roots[0].comments[1].name,'山客');
const unknown=parsePosts((text+'\n---\n访客 @guest 回复 @missing · 今天\n内容不能丢失').split('\n'));assert.equal(unknown[0].comments.length,3);assert.equal(unknown[0].comments[2].target,'@missing');
const separate=parsePosts((text+'\n===\n小林 @xiaolin · 明天\n新的主帖\n---\n访客 @guest 回复 @aqing · 明天\n不跨主帖匹配').split('\n'));assert.equal(separate.length,2);assert.equal(separate[1].comments[0].replies.length,0);
const legacy=parsePosts('1楼 · 楼主\n旧帖内容\n2楼 · 阿青\n旧评论'.split('\n'));assert.equal(legacy[0].comments[0].name,'阿青');
const inline=parsePosts('主帖 甲 @a · 今天\n主帖\n乙 @b · 今天\n评论\n丙 回复 乙：同意'.split('\n'));assert.equal(inline[0].comments[0].replies[0].body[0],'同意');
const html=renderPosts(text.split('\n'));assert(html.includes('weibo-subthread'));assert.equal((html.match(/class="weibo-nested-reply"/g)||[]).length,2);assert(html.includes('回复 <span class="weibo-link">@chenzhou</span>'));assert(!renderPosts(['<script> @bad · 今天','<img src=x onerror=x>']).includes('<script>'));
const marked='[[forum]]\n'+text+'\n[[/]]',b=newBook('微博与楼中楼测试',marked);const sandbox={TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,Int32Array,ArrayBuffer,DataView};vm.runInNewContext(fs.readFileSync('dist/vendor/fflate.js','utf8'),sandbox);const epub=makeEpub(b,sandbox.fflate.zipSync),files=sandbox.fflate.unzipSync(epub);assert(new TextDecoder().decode(files['OEBPS/Text/ch0.xhtml']).includes('weibo-nested-reply'));assert(new TextDecoder().decode(files['OEBPS/Styles/book.css']).includes('.weibo-subthread'));
fs.mkdirSync('test-output',{recursive:true});fs.writeFileSync('test-output/微博楼中楼测试.txt',marked);fs.writeFileSync('test-output/微博楼中楼测试.epub',epub);fs.writeFileSync('test-output/weibo-preview.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>微博楼中楼预览</title><style>${bookCSS(b.style)}body{max-width:620px;margin:24px auto;background:#f4f3ef}</style>${blocksToHTML(marked)}</html>`);
console.log('PASS: 主帖与评论、楼中楼、回复二级评论、独立评论、未知目标保留、跨帖隔离、旧格式兼容、HTML 转义及 EPUB 导出。');
