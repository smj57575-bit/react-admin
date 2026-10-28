// FAQ 관리 — 분류 탭(?category=), 목록, 새로고침 없는 ON/OFF, 삭제
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAdminFaqs, useDeleteFaq, useToggleFaq } from '../../api/admin'
import { ErrorState, Loading } from '../../components/QueryState'
import { Switch } from '../../components/Switch'
import { useAdminTitle } from '../../layouts/AdminLayout'
import { appUrl } from '../../lib/format'
import { DeleteConfirm, type DeleteTarget } from './DeleteConfirm'

const categoryQuery = (category: string | null) => (category === null ? '' : '?' + new URLSearchParams({ category }))

export default function FaqsPage() {
  useAdminTitle('FAQ 관리')
  const [params] = useSearchParams()
  const { data, error, isPending, refetch } = useAdminFaqs(params.get('category'))
  const toggle = useToggleFaq()
  const remove = useDeleteFaq()
  const [target, setTarget] = useState<DeleteTarget | null>(null)

  if (isPending) return <Loading />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  // 없는 분류를 주소에 넣으면 서버가 null(전체)로 돌려준다 → 화면은 서버 값을 따른다
  const category = data.category
  const total = data.categories.reduce((sum, c) => sum + c.count, 0)

  return (
    <>
      <nav className="tabs" aria-label="분류 필터">
        <Link to="/admin/faqs" className={category === null ? 'is-active' : ''}>
          전체 {total}
        </Link>
        {data.categories.map((c) => (
          <Link key={c.name} to={'/admin/faqs' + categoryQuery(c.name)} className={c.name === category ? 'is-active' : ''}>
            {c.name} {c.count}
          </Link>
        ))}
      </nav>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">
            {category ?? '전체 FAQ'} <small>홈페이지에는 분류별로, 순서가 작은 것부터 표시됩니다</small>
          </h2>
          <div className="btn-row">
            <a href={appUrl('#faq')} className="btn btn--ghost" target="_blank" rel="noopener">
              홈페이지 보기
            </a>
            <Link to={'/admin/faqs/new' + categoryQuery(category)} className="btn btn--primary">
              FAQ 등록
            </Link>
          </div>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>순서</th>
                <th style={{ width: 120 }}>분류</th>
                <th>질문</th>
                <th style={{ width: 90 }}>노출</th>
                <th style={{ width: 120 }} aria-label="관리" />
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    등록된 FAQ 가 없습니다.
                  </td>
                </tr>
              )}
              {data.rows.map((f) => (
                <tr key={f.id} className={f.is_active ? '' : 'is-hidden'}>
                  <td className="num">{f.sort_order}</td>
                  <td>
                    <span className="badge badge--primary">{f.category}</span>
                  </td>
                  <td>
                    <Link to={`/admin/faqs/${f.id}`} className="link">
                      {f.question}
                    </Link>
                    {/* 답변 첫머리 — 줄바꿈을 공백으로 모으고 넘치는 부분은 CSS 말줄임 */}
                    <div className="text-muted text-sm text-ellipsis">{f.answer.replace(/\s+/g, ' ')}</div>
                  </td>
                  <td>
                    <Switch checked={f.is_active} onChange={() => toggle.mutate(f)} label={`${f.question} 노출`} disabled={toggle.isPending && toggle.variables.id === f.id} />
                  </td>
                  <td className="actions">
                    <Link to={`/admin/faqs/${f.id}`} className="btn btn--ghost btn--sm">
                      수정
                    </Link>{' '}
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setTarget({ id: f.id, name: f.question })}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <DeleteConfirm target={target} title="FAQ를 삭제할까요?" mutation={remove} onClose={() => setTarget(null)} />
    </>
  )
}
