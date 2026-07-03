// School roster used to validate participants at join time.
//
// This is DUMMY data (grades 1-3, classes 1-4, 20 students each) so the game
// is playable before the real roster is available. Replace `rosterEntries`
// with the real student list — keep the same shape and the rest of the app
// works unchanged. Student id format is GCNN (4 digits): grade(1) + class(1) +
// number(2), e.g. 1101 = 1학년 1반 1번, 3420 = 3학년 4반 20번.

export type RosterEntry = {
  studentId: string;
  name: string;
  grade: number;
  classNo: number;
  number: number;
};

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황"];
const GIVEN = [
  "민준", "서연", "도윤", "지우", "하준", "서현", "지호", "하은", "예준", "윤서",
  "지훈", "수아", "준우", "지아", "건우", "채원", "우진", "지유", "선우", "다은",
];

const GRADES = [1, 2, 3];
const CLASSES = [1, 2, 3, 4];
const STUDENTS_PER_CLASS = 20;

function makeStudentId(grade: number, classNo: number, number: number): string {
  // GCNN: grade(1) + class(1) + number(2), e.g. 1101, 3420.
  return `${grade}${classNo}${String(number).padStart(2, "0")}`;
}

function makeName(seed: number): string {
  const surname = SURNAMES[seed % SURNAMES.length];
  const given = GIVEN[(seed * 3) % GIVEN.length];
  return `${surname}${given}`;
}

function buildRoster(): RosterEntry[] {
  const entries: RosterEntry[] = [];
  let seed = 0;

  for (const grade of GRADES) {
    for (const classNo of CLASSES) {
      for (let number = 1; number <= STUDENTS_PER_CLASS; number += 1) {
        entries.push({
          studentId: makeStudentId(grade, classNo, number),
          name: makeName(seed),
          grade,
          classNo,
          number,
        });
        seed += 1;
      }
    }
  }

  return entries;
}

export const rosterEntries: RosterEntry[] = buildRoster();

// studentId -> canonical name lookup, seeded into the database at seed time.
export function buildRosterRecord(): Record<string, string> {
  return Object.fromEntries(rosterEntries.map((entry) => [entry.studentId, entry.name]));
}
