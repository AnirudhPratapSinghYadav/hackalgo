import { Link } from 'react-router-dom'
import { POST_TYPE_LABELS, type CommunityPost } from '../../domain/platform'
import { ROUTES } from '../../config/routes'

function AuthorBadge({ kind }: { kind: CommunityPost['authorKind'] }) {
  const label =
    kind === 'official'
      ? 'Official'
      : kind === 'field_verified'
        ? 'Field verified'
        : kind === 'system'
          ? 'System'
          : 'Community'
  const variant =
    kind === 'official'
      ? 'bg-accent-primary/15 text-accent-primary'
      : kind === 'field_verified'
        ? 'bg-emerald-500/15 text-emerald-400'
        : 'bg-white/5 text-text-tertiary'
  return <span className={`text-[10px] font-mono uppercase px-2 py-0.5 ${variant}`}>{label}</span>
}

export default function CommunityPostCard({ post }: { post: CommunityPost }) {
  return (
    <article className="border border-border-subtle bg-bg-surface p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
          {POST_TYPE_LABELS[post.type]}
        </span>
        <AuthorBadge kind={post.authorKind} />
        {post.verificationStatus === 'verified' && (
          <span className="text-[10px] font-mono uppercase text-emerald-400/90">Verified</span>
        )}
      </div>

      <div>
        <h3 className="font-serif text-xl text-text-primary leading-snug">{post.title}</h3>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">{post.body}</p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-tertiary font-mono">
        <span>{post.location}</span>
        <span>
          {post.district}, {post.state}
        </span>
        <span>{new Date(post.timestamp).toLocaleString()}</span>
        <span>{post.authorName}</span>
      </div>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 border border-border-subtle text-text-tertiary">
              {t}
            </span>
          ))}
        </div>
      )}

      {post.fundingStatus && (
        <p className="text-xs text-text-secondary">
          Funding: <span className="text-text-primary capitalize">{post.fundingStatus.replace('_', ' ')}</span>
        </p>
      )}

      {post.attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {post.attachments.map((a) => (
            <figure key={a.id} className="border border-border-subtle overflow-hidden">
              <img src={a.url} alt={a.label} className="w-full h-32 object-cover opacity-90" />
              <figcaption className="px-2 py-1 text-[10px] text-text-tertiary font-mono">{a.label}</figcaption>
            </figure>
          ))}
        </div>
      )}

      {post.campaignId && (
        <Link to={ROUTES.communityCampaigns} className="text-sm text-accent-primary">
          View campaigns →
        </Link>
      )}
    </article>
  )
}
