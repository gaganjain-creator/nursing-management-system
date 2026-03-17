import { NurseProfilesClient } from "@/components/nurses/NurseProfilesClient"

export default function SupervisorNurseProfilesPage() {
  return <NurseProfilesClient basePath="/supervisor/nurse-profiles" canCreate={true} />
}
