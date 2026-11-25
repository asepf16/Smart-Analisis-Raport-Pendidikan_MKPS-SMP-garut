import { OfficialDocument, SchoolProfile } from '../types';

/**
 * Generates an official Indonesian letterhead text from the current SchoolProfile.
 */
export function buildDefaultLetterhead(
  school: Pick<SchoolProfile, 'name' | 'city' | 'npsn' | 'accreditationGrade'>
): string {
  const region = school.city?.trim() ? school.city.trim().toUpperCase() : 'KABUPATEN/KOTA';
  const schoolName = school.name?.trim() ? school.name.trim().toUpperCase() : 'SATUAN PENDIDIKAN';
  const npsn = school.npsn?.trim() || '-';
  const acc =
    school.accreditationGrade && school.accreditationGrade !== 'Belum Terakreditasi'
      ? ` - AKREDITASI ${school.accreditationGrade}`
      : '';

  return `PEMERINTAH ${region} - DINAS PENDIDIKAN\n${schoolName}\nNPSN: ${npsn}${acc}`;
}

/**
 * Checks if a letterhead still looks outdated (empty, matches template samples,
 * references an older school name, or does not contain the current school name
 * while using the standard PEMERINTAH ... DINAS PENDIDIKAN template).
 */
export function isOutdatedLetterhead(
  letterheadText: string | undefined,
  currentSchool: SchoolProfile,
  prevSchool?: SchoolProfile
): boolean {
  const trimmed = (letterheadText || '').trim();
  if (!trimmed) return true;

  const upper = trimmed.toUpperCase();
  const currentNameUpper = (currentSchool.name || '').trim().toUpperCase();

  // References known sample/placeholder schools when active school is different
  if (
    (upper.includes('HARAPAN BANGSA') && !currentNameUpper.includes('HARAPAN BANGSA')) ||
    (upper.includes('HARAPAN NUSANTARA') && !currentNameUpper.includes('HARAPAN NUSANTARA')) ||
    (upper.includes('CENDEKIA') && !currentNameUpper.includes('CENDEKIA'))
  ) {
    return true;
  }

  // Matches previous school profile's auto-generated letterhead or mentions previous school name
  if (prevSchool) {
    const prevAuto = buildDefaultLetterhead(prevSchool).toUpperCase();
    const prevNameUpper = (prevSchool.name || '').trim().toUpperCase();
    if (upper === prevAuto) return true;
    if (prevNameUpper && upper.includes(prevNameUpper) && prevNameUpper !== currentNameUpper) {
      return true;
    }
    if (
      prevSchool.city &&
      prevSchool.city.trim().toUpperCase() !== (currentSchool.city || '').trim().toUpperCase() &&
      upper.includes(prevSchool.city.trim().toUpperCase())
    ) {
      return true;
    }
    if (
      prevSchool.npsn &&
      prevSchool.npsn.trim() !== (currentSchool.npsn || '').trim() &&
      upper.includes(prevSchool.npsn.trim())
    ) {
      return true;
    }
  }

  // Standard 3-line template that doesn't contain the active school's name
  if (
    upper.startsWith('PEMERINTAH ') &&
    upper.includes('DINAS PENDIDIKAN') &&
    currentNameUpper &&
    !upper.includes(currentNameUpper)
  ) {
    return true;
  }

  return false;
}

/**
 * Synchronizes letterheadText when school identity changes or loads.
 */
export function syncLetterheadWithProfile(
  letterheadText: string | undefined,
  nextSchool: SchoolProfile,
  prevSchool?: SchoolProfile
): string {
  if (isOutdatedLetterhead(letterheadText, nextSchool, prevSchool)) {
    return buildDefaultLetterhead(nextSchool);
  }
  return (letterheadText || '').trim() || buildDefaultLetterhead(nextSchool);
}

/**
 * Replaces occurrences of legacy/sample or previous school identity text inside archived documents.
 */
function replaceAllCaseInsensitive(text: string, search: string, replacement: string): string {
  if (!text || !search || search.trim() === replacement.trim()) return text;
  const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), replacement);
}

export function syncDocumentsWithSchoolProfile(
  documents: OfficialDocument[],
  nextSchool: SchoolProfile,
  prevSchool?: SchoolProfile
): OfficialDocument[] {
  if (!Array.isArray(documents)) return [];

  const legacySchoolNames = [
    'SMP NEGERI 1 HARAPAN BANGSA',
    'SMP Negeri 1 Harapan Bangsa',
    'SMP NEGERI 2 HARAPAN NUSANTARA',
    'SMP Negeri 2 Harapan Nusantara',
    'SD Negeri 03 Cendekia',
  ];

  const legacyPrincipalNames = [
    'Dra. Hj. Siti Nurjanah, M.Pd.',
    'Dra. Siti Nurjanah, M.Pd.',
  ];

  const legacySupervisorNames = ['Dr. H. Endang Suryana, M.M.Pd.'];
  const legacyCities = ['Kota Bandung'];

  const nextName = nextSchool.name.trim();
  const nextCity = nextSchool.city.trim();
  const nextPrincipal = nextSchool.principalName.trim();
  const nextNip = nextSchool.principalNip?.trim() || '-';

  return documents.map((doc) => {
    let title = doc.title;
    let approvedBy = doc.approvedBy;
    let contentMarkdown = doc.contentMarkdown;

    const applyReplacements = (input: string): string => {
      let out = input;

      // Replace previous school name/city/principal first if provided
      if (prevSchool) {
        if (prevSchool.name && prevSchool.name.trim() !== nextName) {
          out = replaceAllCaseInsensitive(out, prevSchool.name.toUpperCase(), nextName.toUpperCase());
          out = replaceAllCaseInsensitive(out, prevSchool.name, nextName);
        }
        if (prevSchool.city && prevSchool.city.trim() !== nextCity) {
          out = replaceAllCaseInsensitive(out, prevSchool.city, nextCity);
        }
        if (prevSchool.principalName && prevSchool.principalName.trim() !== nextPrincipal) {
          out = replaceAllCaseInsensitive(out, prevSchool.principalName, nextPrincipal);
        }
        if (prevSchool.principalNip && prevSchool.principalNip.trim() !== nextNip) {
          out = replaceAllCaseInsensitive(out, prevSchool.principalNip, nextNip);
        }
      }

      // Replace sample school names if active school is not that sample school
      for (const legacyName of legacySchoolNames) {
        if (nextName.toUpperCase() !== legacyName.toUpperCase()) {
          const replacement =
            legacyName === legacyName.toUpperCase() ? nextName.toUpperCase() : nextName;
          out = replaceAllCaseInsensitive(out, legacyName, replacement);
        }
      }

      // Replace sample principal names if active principal is different
      for (const legacyPrincipal of legacyPrincipalNames) {
        if (nextPrincipal.toLowerCase() !== legacyPrincipal.toLowerCase()) {
          out = replaceAllCaseInsensitive(out, legacyPrincipal, nextPrincipal);
        }
      }

      // Replace hardcoded sample supervisor / NIP / city when school differs
      if (!nextName.toUpperCase().includes('HARAPAN BANGSA')) {
        for (const sup of legacySupervisorNames) {
          out = replaceAllCaseInsensitive(
            out,
            sup,
            `Pengawas Pembina Dinas Pendidikan ${nextCity}`
          );
        }
        out = replaceAllCaseInsensitive(out, '19740512 199903 2 004', nextNip);
        out = replaceAllCaseInsensitive(out, '19680310 199412 1 002', '-');
        if (nextSchool.totalStudyGroups > 0) {
          out = out.replace(/18 rombongan belajar/gi, `${nextSchool.totalStudyGroups} rombongan belajar`);
        }
        if (nextSchool.totalStudents > 0) {
          out = out.replace(/648 siswa/gi, `${nextSchool.totalStudents} siswa`);
        }
        for (const legacyCity of legacyCities) {
          if (nextCity.toLowerCase() !== legacyCity.toLowerCase()) {
            out = replaceAllCaseInsensitive(out, legacyCity, nextCity);
          }
        }
      }

      return out;
    };

    title = applyReplacements(title);
    if (approvedBy) approvedBy = applyReplacements(approvedBy);
    if (contentMarkdown) contentMarkdown = applyReplacements(contentMarkdown);

    return {
      ...doc,
      title,
      approvedBy,
      contentMarkdown,
    };
  });
}

/**
 * Checks if any document or letterhead inside the database still contains stale sample names.
 */
export function hasStaleSchoolReferences(
  school: SchoolProfile,
  documents: OfficialDocument[]
): boolean {
  if (isOutdatedLetterhead(school.letterheadText, school)) {
    return true;
  }

  const currentNameLower = (school.name || '').trim().toLowerCase();
  if (currentNameLower.includes('harapan bangsa')) return false;

  return documents.some((d) => {
    const combined = `${d.title} ${d.approvedBy || ''} ${d.contentMarkdown || ''}`.toLowerCase();
    return (
      combined.includes('harapan bangsa') ||
      combined.includes('siti nurjanah')
    );
  });
}
