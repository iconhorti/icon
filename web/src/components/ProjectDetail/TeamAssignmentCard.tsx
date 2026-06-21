import { useState, useEffect, type ChangeEvent } from 'react';
import {
  assignContractor,
  getSkills, getContractorsBySkill,
} from '../../api/client';
import {
  Hammer
} from 'lucide-react';
import '../../pages/ProjectDetail.css';
import { useToast } from '../../context/ToastContext';

import type { ProjectDetail, Skill, ProjectContractor } from '../../types/models';

// ============================================================
// TeamAssignmentCard
// ============================================================

interface TeamAssignmentCardProps {
  project: ProjectDetail;
  userRole: string;
  refresh: () => void;
}

interface AssignedContractorEntry {
  contractor: any;
  skills: any[];
}

const TeamAssignmentCard = ({ project, userRole, refresh }: TeamAssignmentCardProps) => {
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [contractorList, setContractorList] = useState<any[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [loadingContractors, setLoadingContractors] = useState(false);

  useEffect(() => {
    getSkills()
      .then(data => {
        setSkills(data || []);
        if (data && data.length > 0) setSelectedSkillId(String(data[0].id));
      })
      .catch(console.error)
      .finally(() => setLoadingSkills(false));
  }, []);

  useEffect(() => {
    if (!selectedSkillId) return;
    setLoadingContractors(true);
    setSelectedContractorId('');
    const skill = skills.find(s => String(s.id) === selectedSkillId);
    if (!skill) { setLoadingContractors(false); return; }
    getContractorsBySkill(skill.name ?? '')
      .then(data => setContractorList(data || []))
      .catch(console.error)
      .finally(() => setLoadingContractors(false));
  }, [selectedSkillId, skills]);

  const handleAssign = async () => {
    if (!selectedContractorId || !selectedSkillId) return toast('Select both skill and contractor.', 'warning');
    setAssigning(true);
    try {
      await assignContractor({
        project_id: project.id,
        contractor_id: parseInt(selectedContractorId),
        skill_id: parseInt(selectedSkillId),
      } as any);
      toast('Assigned successfully!', 'success');
      refresh();
    } catch (e: any) {
      toast('Assignment failed: ' + (e.response?.data?.detail || e.message), 'error');
    } finally {
      setAssigning(false);
    }
  };

  if (!['admin', 'owner', 'project_manager'].includes(userRole)) return null;

  const assignedContractors: Record<string, AssignedContractorEntry> = {};
  ((project as any).contractors as ProjectContractor[] | undefined)?.forEach((pc: any) => {
    if (!assignedContractors[pc.contractor_id]) {
      assignedContractors[pc.contractor_id] = { contractor: pc.contractor, skills: [] };
    }
    assignedContractors[pc.contractor_id].skills.push(pc.skill);
  });

  return (
    <div className="glass-card detail-card animate-delay-2" style={{ marginTop: '1.25rem' }}>
      <h3 className="card-title text-accent"><Hammer size={18} /> Assign Contractors</h3>

      {Object.keys(assignedContractors).length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          {Object.values(assignedContractors).map(({ contractor, skills: contractorSkills }) => (
            <div key={contractor?.id || Math.random()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
              <span className="font-medium" style={{ minWidth: '150px' }}>
                {contractor?.first_name || 'Unknown'} {contractor?.last_name || ''}
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {contractorSkills.map((sk: any, i: number) => (
                  sk && (
                    <span key={i} className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                      {sk.name}
                    </span>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="input-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
          <label className="input-label">Skill</label>
          <select className="input-field" value={selectedSkillId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedSkillId(e.target.value)} disabled={loadingSkills}>
            {loadingSkills ? <option>Loading...</option> : skills.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="input-group" style={{ flex: '2 1 250px', marginBottom: 0 }}>
          <label className="input-label">Contractor</label>
          <select className="input-field" value={selectedContractorId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedContractorId(e.target.value)} disabled={loadingContractors}>
            <option value="">-- Select Contractor --</option>
            {contractorList.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name || ''} ({c.phone_primary || '—'})
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleAssign} disabled={assigning || !selectedContractorId || !selectedSkillId}>
          {assigning ? 'Assigning...' : 'Assign'}
        </button>
      </div>
    </div>
  );
};


export default TeamAssignmentCard;
