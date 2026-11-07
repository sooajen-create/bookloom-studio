import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {blocksToHTML,newBook,makeEpub,bookCSS} from './dist/core.mjs';
import {componentCSS} from './dist/components.mjs';
const sample=`[[chat|山间来信|我=阿青]]
小林 [09:41]：信到了吗？
旁白：她低头看了看信封。
阿青 [09:42]：到了。
阿青 [09:43]：我现在读给你听。
陈舟：你们在说什么？
（窗外的风轻轻吹过。）
[[/]]
[[forum|春日动态]]
小林 @xiaolin · 10月12日
今天收到一封山间来信。你有没有写过信给未来的自己？
回复 3 · 转发 2 · 喜欢 12
---
阿青 @aqing · 10月12日
有些故事，走回来才能读懂。
回复 1 · 转发 0 · 喜欢 8
[[/]]
[[letter|山间来信]]
称呼：亲爱的你：

当你读到这封信，窗外应该又是一个晴天。愿你还记得，山间总有一条路在等你回来。

愿你平安，也愿你自在。

落款：小林
日期：十月十二日
[[/]]`;
const html=blocksToHTML(sample);
assert.equal((html.match(/chat-message is-self/g)||[]).length,2,'同一人物连续发言保持右侧');
assert.equal((html.match(/class="chat-narration"/g)||[]).length,2,'旁白和括号动作不进入气泡');
assert(!html.includes('chat-time'));assert(!html.includes('chat-name'));assert(!html.includes('chat-avatar'));assert(!html.includes('chat-header'));assert(html.includes('bubble-tail'));assert(!html.includes('09:41'));assert(!html.includes('41]：'));assert(html.includes('@xiaolin'));assert.equal((html.match(/class="tweet"/g)||[]).length,2);assert(!html.includes('>---<'));assert(html.includes('letter-salutation'));assert(html.includes('letter-signature'));assert(html.includes('十月十二日'));
const explicit=blocksToHTML('[[chat|对话|我=甲]]\n甲：第一句\n乙：第二句\n甲：第三句\n[[/]]');assert.equal((explicit.match(/chat-message is-self/g)||[]).length,2);
const hostile=blocksToHTML('[[letter|<img onerror=x>]]\n<script>alert(1)</script>\n[[/]]\n[[forum]]\n<script> @bad · now\n<img src=x onerror=x>\n[[/]]');assert(!hostile.includes('<script>'));assert(!hostile.includes('<img '));
assert(!componentCSS().includes('#fee500'));assert(componentCSS().includes('background:transparent!important'));assert(componentCSS(true).includes('background-image:none'));
const b=newBook('组件排版验收',sample);const css=bookCSS(b.style);assert(css.includes('.letter-paper'));assert(css.includes('.chat-narration'));assert(css.includes('.tweet-actions'));
const sandbox={TextEncoder,TextDecoder,Uint8Array,Uint16Array,Uint32Array,Int32Array,ArrayBuffer,DataView};vm.runInNewContext(fs.readFileSync('./dist/vendor/fflate.js','utf8'),sandbox);const archive=makeEpub(b,sandbox.fflate.zipSync),files=sandbox.fflate.unzipSync(archive);const chapter=new TextDecoder().decode(files['OEBPS/Text/ch0.xhtml']);assert(chapter.includes('letter-paper'));assert(chapter.includes('chat-narration'));assert(chapter.includes('tweet'));fs.mkdirSync('test-output',{recursive:true});fs.writeFileSync('test-output/components.epub',archive);
fs.writeFileSync('test-output/components-preview.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>组件排版验收</title><style>body{background:#f6f4ee;margin:0;padding:25px;font:17px/1.9 sans-serif;color:#33443a}main{max-width:560px;margin:auto}h1{font:27px serif}h2{font:18px serif;margin-top:30px}${componentCSS()}</style><main><h1>书织 · 新组件样式</h1>${html}</main></html>`);
fs.writeFileSync('test-output/组件样式测试.txt',sample);
console.log('PASS: 固定人物方向、连续发言、旁白/动作、无聊天面板及元信息、帖子与统计、信纸落款、HTML 转义、共享 EPUB 样式。');
