// 홈 FAQ — 질문을 누르면 답변이 열린다 (<details> 라서 JS 상태가 필요 없다)
// 노출할 FAQ 가 없으면 HomePage 가 이 섹션과 FAQ 탭을 함께 뺀다
import type { FaqGroup } from '../../../api/types'
import { Multiline } from './Multiline'

export function FaqSection({ groups }: { groups: FaqGroup[] }) {
  return (
    <section className="section section--tint" id="faq">
      <div className="container faq">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2 className="section__title">자주 묻는 질문</h2>
        </div>
        <div className="faq__groups">
          {groups.map((group) => (
            <div key={group.category} className="faq__group">
              <h3 className="faq__category">{group.category}</h3>
              {group.items.map((item) => (
                <details key={item.id} className="faq__item">
                  <summary className="faq__question">{item.question}</summary>
                  <div className="faq__answer">
                    <Multiline text={item.answer} />
                  </div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
