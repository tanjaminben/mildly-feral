import { requireChatGPTUser } from "./chatgpt-auth";
import Fieldbook from "./fieldbook";
export const dynamic="force-dynamic";
export default async function Page(){await requireChatGPTUser("/");return <Fieldbook/>;}
