// 데모 안내 문구 — 데모 사이트에는 공유 DB 가 없어서, 쓴 글이 다른 사람에게 보이지 않는다는 걸 미리 알려 준다
import { IS_DEMO } from '../api/client'

export function DemoNote() {
  if (!IS_DEMO) return null
  return (
    <p className="demo-note">
      데모 사이트라 DB가 연결되어 있지 않아요. 작성한 글은 이 브라우저에만 저장되고 다른 사람에게는 보이지 않아요.
    </p>
  )
}
