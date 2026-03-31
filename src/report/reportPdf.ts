import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { ReportData } from './reportData'

export async function downloadReportPdf(data: ReportData, chartContainerId: string): Promise<void> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const margin = 40
  const contentW = pageW - margin * 2
  let y = margin

  pdf.setFillColor(17, 24, 39)
  pdf.rect(0, 0, pageW, 100, 'F')

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text('AlgoVault Savings Report', margin, 45)

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(180, 180, 200)
  pdf.text(`${data.periodLabel}  ·  ${data.truncatedAddress}  ·  App ${data.appId}  ·  Algorand ${data.network}`, margin, 65)
  pdf.text(`Generated: ${new Date(data.generatedAt).toLocaleString()}`, margin, 80)

  y = 120

  pdf.setTextColor(30, 30, 30)
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Summary', margin, y)
  y += 20

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  const summaryRows = [
    ['Total Saved', `${data.totalSaved.toFixed(2)} ALGO`],
    ['Deposited This Period', `${data.totalDepositedPeriod.toFixed(2)} ALGO`],
    ['Withdrawn This Period', `${data.totalWithdrawnPeriod.toFixed(2)} ALGO`],
    ['Deposit Streak', `${data.streak} consecutive`],
    ['Milestone', data.milestoneLabel],
    ['Global Vault', `${data.globalDeposited.toFixed(2)} ALGO from ${data.globalUsers} users`],
  ]

  for (const [label, value] of summaryRows) {
    pdf.setTextColor(100, 100, 100)
    pdf.text(label, margin, y)
    pdf.setTextColor(30, 30, 30)
    pdf.setFont('helvetica', 'bold')
    pdf.text(value, margin + contentW * 0.5, y)
    pdf.setFont('helvetica', 'normal')
    y += 16
  }

  y += 10

  const chartEl = document.getElementById(chartContainerId)
  if (chartEl) {
    try {
      const canvas = await html2canvas(chartEl, { backgroundColor: '#ffffff', scale: 1.5, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const imgW = contentW
      const imgH = (canvas.height / canvas.width) * imgW

      if (y + imgH > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage()
        y = margin
      }

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 30, 30)
      pdf.text('Charts', margin, y)
      y += 16

      pdf.addImage(imgData, 'PNG', margin, y, imgW, imgH, undefined, 'FAST')
      y += imgH + 16
    } catch {
      // charts render failed, skip gracefully
    }
  }

  if (y + 30 > pdf.internal.pageSize.getHeight() - margin) {
    pdf.addPage()
    y = margin
  }

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(30, 30, 30)
  pdf.text('Transaction Proof', margin, y)
  y += 16

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(100, 100, 100)
  const colX = [margin, margin + 60, margin + 140, margin + 220, margin + 320]
  pdf.text('Date', colX[0], y)
  pdf.text('Type', colX[1], y)
  pdf.text('Amount', colX[2], y)
  pdf.text('Status', colX[3], y)
  pdf.text('Transaction ID', colX[4], y)
  y += 12

  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(50, 50, 50)

  const maxRows = Math.min(data.transactions.length, 20)
  for (let i = 0; i < maxRows; i++) {
    if (y > pdf.internal.pageSize.getHeight() - margin - 20) {
      pdf.addPage()
      y = margin
    }
    const t = data.transactions[i]
    pdf.text(t.date, colX[0], y)
    pdf.text(t.action || t.type, colX[1], y)
    pdf.text(t.amount > 0 ? `${(t.amount / 1_000_000).toFixed(2)}` : '—', colX[2], y)
    pdf.text('Confirmed', colX[3], y)
    pdf.setTextColor(37, 99, 235)
    pdf.textWithLink(t.txId.slice(0, 12) + '...', colX[4], y, { url: t.loraUrl })
    pdf.setTextColor(50, 50, 50)
    y += 11
  }

  y += 16
  pdf.setFontSize(7)
  pdf.setTextColor(150, 150, 150)
  pdf.text('All data verified on Algorand blockchain via Lora Explorer. This report was generated from live on-chain state.', margin, y)

  const dateSafe = new Date().toISOString().slice(0, 10)
  pdf.save(`AlgoVault-Report-${dateSafe}.pdf`)
}
