
import React, { createContext, useContext, useState, useCallback } from 'react';

interface SelectedSkill {
  id: string;
  name: string;
  score: number;
  type: 'content' | 'subject';
  studentId?: string;
  studentName?: string;
}

interface MultiSkillSelectionContextType {
  selectedSkills: SelectedSkill[];
  isSelectionMode: boolean;
  toggleSelectionMode: () => void;
  toggleSkillSelection: (skill: SelectedSkill) => void;
  clearSelection: () => void;
  canSelectMore: boolean;
  maxSkills: number;
}

const MultiSkillSelectionContext = createContext<MultiSkillSelectionContextType | undefined>(undefined);

export function MultiSkillSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const maxSkills = 5;

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedSkills([]); // Clear selection when exiting selection mode
      }
      return !prev;
    });
  }, []);

  const toggleSkillSelection = useCallback((skill: SelectedSkill) => {
    setSelectedSkills(prev => {
      const isSelected = prev.some(s => s.id === skill.id);
      if (isSelected) {
        return prev.filter(s => s.id !== skill.id);
      } else if (prev.length < maxSkills) {
        return [...prev, skill];
      }
      return prev; // Don't add if at max limit
    });
  }, [maxSkills]);

  const clearSelection = useCallback(() => {
    setSelectedSkills([]);
  }, []);

  const canSelectMore = selectedSkills.length < maxSkills;

  return (
    <MultiSkillSelectionContext.Provider value={{
      selectedSkills,
      isSelectionMode,
      toggleSelectionMode,
      toggleSkillSelection,
      clearSelection,
      canSelectMore,
      maxSkills
    }}>
      {children}
    </MultiSkillSelectionContext.Provider>
  );
}

export function useMultiSkillSelection() {
  const context = useContext(MultiSkillSelectionContext);
  if (context === undefined) {
    throw new Error('useMultiSkillSelection must be used within a MultiSkillSelectionProvider');
  }
  return context;
}
