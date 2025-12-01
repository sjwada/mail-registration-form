
function debugSheetData() {
  const result = {
    guardian: { count: 0, sample: null },
    student: { count: 0, sample: null }
  };

  try {
    const guardianSheet = getGuardianSheet();
    const guardianData = guardianSheet.getDataRange().getValues();
    result.guardian.count = guardianData.length;
    if (guardianData.length > 1) {
      // Log first data row (index 1)
      result.guardian.sample = guardianData[1].map((cell, index) => `[${index}]${cell}`).join(', ');
    }

    const studentSheet = getStudentSheet();
    const studentData = studentSheet.getDataRange().getValues();
    result.student.count = studentData.length;
    if (studentData.length > 1) {
      result.student.sample = studentData[1].map((cell, index) => `[${index}]${cell}`).join(', ');
    }
    
    Logger.log(JSON.stringify(result, null, 2));
    return result;

  } catch (e) {
    Logger.log('Error in debugSheetData: ' + e.toString());
    return { error: e.toString() };
  }
}
