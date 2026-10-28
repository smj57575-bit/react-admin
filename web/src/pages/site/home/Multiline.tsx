// 줄바꿈(\n)을 <br> 로 — PHP 의 nl2br(h(...)) 와 같다
// dangerouslySetInnerHTML 을 쓰지 않으므로 글 안의 HTML 은 그냥 글자로 보인다 (XSS 걱정 없음)
import { Fragment } from 'react'

export function Multiline({ text }: { text: string }) {
  return text.split('\n').map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ))
}
