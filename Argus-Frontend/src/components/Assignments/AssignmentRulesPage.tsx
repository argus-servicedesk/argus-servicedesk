import { useAssignmentRules, useCreateAssignmentRule, useCategoryGroupMappings } from '../../hooks/useAssignments';
import { SNPage, SNRecordHeader, SNCollapsibleSection, SNRecordGrid, SNRecordField, SNPillBadge, sn } from '../ITSMTemplates/ServiceNowUI';
import { Plus } from 'lucide-react';

export default function AssignmentRulesPage() {
  const { data: rules, isLoading: rulesLoading } = useAssignmentRules();
  const { data: mappings, isLoading: mappingsLoading } = useCategoryGroupMappings();

  return (
    <SNPage className="sn-admin-page">
      <SNRecordHeader
        number="Assignment Rules"
        priorityPill={<SNPillBadge label="Routing" tone="neutral" />}
        statePill={<SNPillBadge label="Active" tone="success" />}
        secondaryActions={(
          <button className="sn-primary-button inline-flex items-center gap-2">
            <Plus size={16} />
            New Rule
          </button>
        )}
      />

      <div className="flex flex-col gap-6 mt-6">
        <SNCollapsibleSection title="Active Routing Rules">
          <div className="sn-admin-table-container">
            <table className="sn-admin-table w-full text-left">
              <thead>
                <tr className="border-b bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Conditions</th>
                  <th className="px-4 py-2">Target Group</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {rules?.data?.map((rule: any) => (
                  <tr key={rule.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-400">{rule.order}</td>
                    <td className="px-4 py-3 font-medium text-indigo-600 cursor-pointer hover:underline">{rule.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {rule.conditions.rules.map((c: any, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600 border">
                            {c.field} {c.operator} {c.value}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{rule.target_group_details?.name}</td>
                    <td className="px-4 py-3">
                      <SNPillBadge label={rule.is_active ? "Active" : "Inactive"} tone={rule.is_active ? "success" : "neutral"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SNCollapsibleSection>

        <SNCollapsibleSection title="Category to Group Mappings">
          <div className="sn-admin-table-container">
            <table className="sn-admin-table w-full text-left">
              <thead>
                <tr className="border-b bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Subcategory</th>
                  <th className="px-4 py-2">Target Team</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {mappings?.data?.map((mapping: any) => (
                  <tr key={mapping.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{mapping.category}</td>
                    <td className="px-4 py-3 text-gray-500">{mapping.subcategory || '-- All --'}</td>
                    <td className="px-4 py-3 font-medium text-indigo-600">{mapping.team_details?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SNCollapsibleSection>
      </div>
    </SNPage>
  );
}
