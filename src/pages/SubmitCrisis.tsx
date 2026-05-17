import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { Upload, MapPin, DollarSign } from 'lucide-react'
import PublicHeader from '../components/layout/PublicHeader'
import ComplianceBanner from '../components/ComplianceBanner'
import { OpsPanel, Button } from '../components/ui'
import { ROUTES } from '../config/routes'
import { useCommunityStore } from '../store/communityStore'
import { usePlatformStore } from '../store/platformStore'
import { submitCrisisSchema, type SubmitCrisisForm } from '../schemas/submitCrisis'
import { createAppealOnChain, isAppealsHubConfigured } from '../services/communityDonation'

const inputClass =
  'w-full px-4 py-3 bg-bg-elevated border border-border-medium text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none min-h-[44px]'
const labelClass = 'block text-sm font-medium text-text-primary mb-2'
const errorClass = 'mt-1 text-xs text-alert-critical font-mono'

export default function SubmitCrisis() {
  const navigate = useNavigate()
  const addCrisis = useCommunityStore((s) => s.addCrisis)
  const setCrisisOnChain = usePlatformStore((s) => s.setCrisisOnChain)
  const { activeAddress, signTransactions } = useWallet()
  const [chainErr, setChainErr] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmitCrisisForm>({
    resolver: zodResolver(submitCrisisSchema),
    defaultValues: { category: 'other' },
  })

  const onSubmit = async (data: SubmitCrisisForm) => {
    setChainErr(null)
    const id = addCrisis({
      title: data.title,
      description: data.description,
      category: data.category,
      city: data.city,
      state: data.state,
      requiredAmount: data.requiredAmount,
      beneficiaryWallet: data.beneficiaryWallet,
    })

    if (isAppealsHubConfigured() && activeAddress && signTransactions) {
      try {
        const metadataUri = `https://algovault.local/appeal/${id}`
        const targetMicro = Math.round(data.requiredAmount * 1_000_000)
        const { txId, appealId } = await createAppealOnChain(activeAddress, signTransactions, {
          targetMicroAlgo: targetMicro,
          beneficiary: data.beneficiaryWallet,
          metadataUri,
        })
        setCrisisOnChain(id, { onChainAppealId: appealId, chainStatus: 'pending', txnHash: txId })
      } catch (e) {
        setChainErr(e instanceof Error ? e.message : 'On-chain create_appeal failed — saved locally only')
      }
    }

    navigate(ROUTES.communityDetail(id))
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader subtitle="Submit crisis for verification" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-16">
        <ComplianceBanner />
        <p className="font-mono text-[11px] uppercase tracking-label text-text-tertiary mt-6">VerifyChain intake</p>
        <h1 className="font-serif text-3xl text-text-primary mt-2">Report a crisis for field verification</h1>
        <p className="mt-3 text-text-secondary text-sm leading-relaxed">
          Submissions create a pending on-chain appeal when VITE_APPEALS_APP_ID is set. Admin approval enables donations.
        </p>
        {chainErr ? <p className="mt-3 text-xs text-alert-critical font-mono">{chainErr}</p> : null}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-10">
          <OpsPanel title="Crisis details">
            <div className="space-y-6">
              <div>
                <label className={labelClass} htmlFor="title">
                  Crisis title
                </label>
                <input id="title" className={inputClass} placeholder="Brief, factual summary" {...register('title')} />
                {errors.title ? <p className={errorClass}>{errors.title.message}</p> : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="description">
                  Detailed description
                </label>
                <textarea
                  id="description"
                  rows={6}
                  className={`${inputClass} resize-none`}
                  placeholder="What happened, when, who is affected, and what funds are needed for"
                  {...register('description')}
                />
                {errors.description ? <p className={errorClass}>{errors.description.message}</p> : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="category">
                  Category
                </label>
                <select id="category" className={inputClass} {...register('category')}>
                  <option value="disaster">Natural disaster</option>
                  <option value="medical">Medical emergency</option>
                  <option value="housing">Housing crisis</option>
                  <option value="education">Education</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="city">
                    <MapPin size={14} className="inline mr-1" strokeWidth={1.5} />
                    City
                  </label>
                  <input id="city" className={inputClass} {...register('city')} />
                  {errors.city ? <p className={errorClass}>{errors.city.message}</p> : null}
                </div>
                <div>
                  <label className={labelClass} htmlFor="state">
                    State
                  </label>
                  <input id="state" className={inputClass} {...register('state')} />
                  {errors.state ? <p className={errorClass}>{errors.state.message}</p> : null}
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="requiredAmount">
                  <DollarSign size={14} className="inline mr-1" strokeWidth={1.5} />
                  Target amount (ALGO)
                </label>
                <input
                  id="requiredAmount"
                  type="number"
                  className={inputClass}
                  {...register('requiredAmount', { valueAsNumber: true })}
                />
                {errors.requiredAmount ? <p className={errorClass}>{errors.requiredAmount.message}</p> : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="beneficiaryWallet">
                  Beneficiary Algorand wallet
                </label>
                <input id="beneficiaryWallet" className={inputClass} {...register('beneficiaryWallet')} />
                {errors.beneficiaryWallet ? <p className={errorClass}>{errors.beneficiaryWallet.message}</p> : null}
              </div>

              <Button type="submit" variant="primary" disabled={isSubmitting}>
                <Upload size={16} className="inline mr-2" />
                {isSubmitting ? 'Submitting…' : 'Submit for verification'}
              </Button>
            </div>
          </OpsPanel>
        </form>
      </div>
    </div>
  )
}
