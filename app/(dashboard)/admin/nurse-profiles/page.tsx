import { NurseProfilesClient } from "@/components/nurses/NurseProfilesClient"

export default function AdminNurseProfilesPage() {
  return <NurseProfilesClient basePath="/admin/nurse-profiles" canCreate={true} />
}
