import SupportTicketDetailPage from "../../../_components/pages/SupportTicketDetailPage"

export const metadata = { title: "Ticket Detail – mokhaLab Admin" }

export default function Page({ params }: { params: { id: string } }) {
  return <SupportTicketDetailPage id={params.id} />
}
