-- AgentAppPermission.appId, AgentSession.appId, and AppUsageMetric.appId all
-- hold AgentApp's human-readable identifier (e.g. "notion", "slack") -- the
-- same value the application looks these rows up by everywhere
-- (`AgentApp.findUnique({ where: { appId } })`, `where: { appId: app_id }`,
-- etc). But their foreign keys were declared against `agent_apps("id")`,
-- AgentApp's internal UUID primary key, not `agent_apps("appId")`. Every
-- insert into these three tables violated the foreign key constraint (the
-- human-readable string is never a valid UUID row id), so OAuth
-- authorization approval, agent chat sessions, and usage-metric recording
-- all failed unconditionally, in every environment, since these tables
-- were introduced.
ALTER TABLE "agent_app_permissions" DROP CONSTRAINT "agent_app_permissions_app_id_fkey";
ALTER TABLE "agent_sessions" DROP CONSTRAINT "agent_sessions_app_id_fkey";
ALTER TABLE "app_usage_metrics" DROP CONSTRAINT "app_usage_metrics_app_id_fkey";

ALTER TABLE "agent_app_permissions" ADD CONSTRAINT "agent_app_permissions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "agent_apps"("appId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "agent_apps"("appId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app_usage_metrics" ADD CONSTRAINT "app_usage_metrics_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "agent_apps"("appId") ON DELETE CASCADE ON UPDATE CASCADE;
