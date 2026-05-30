const cleanNum = (val: any): number => {
    if (!val || val === 'N/A') return 0;
    
    // Convert to upper string and replace spacing and symbols
    let s = String(val).toUpperCase().replace(/•/g, '').trim();
    
    // Extract multiplier
    let multiplier = 1;
    if (s.includes('M') || s.includes('MILLON') || s.includes('MILLÓN') || s.includes('MILLONES') || s.includes('MILLION')) {
      multiplier = 1000000;
      s = s.replace(/M|MILLON|MILLÓN|MILLONES|MILLION/g, '');
    } else if (s.includes('K') || s.includes('MIL') || s.includes('THOUSAND')) {
      multiplier = 1000;
      s = s.replace(/K|MIL|THOUSAND/g, '');
    }
    
    s = s.trim();
    
    // Resolve thousands separators in different language formats
    if (s.includes(',') && s.includes('.')) {
      const dotIndex = s.indexOf('.');
      const commaIndex = s.indexOf(',');
      if (dotIndex < commaIndex) {
        // Dot is thousand, comma is decimal (e.g., 1.234,56)
        s = s.replace(/\\./g, '').replace(/,/g, '.');
      } else {
        // Comma is thousand, dot is decimal (e.g., 1,234.56)
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      // Only comma exists. If followed by exactly 3 digits and multiplier is 1, treat as thousands. Otherwise decimal.
      const parts = s.split(',');
      if (parts[1] && parts[1].length === 3 && multiplier === 1) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(/,/g, '.');
      }
    } else if (s.includes('.')) {
      // Only dot exists. If followed by exactly 3 digits and multiplier is 1, treat as thousands. Otherwise decimal.
      const parts = s.split('.');
      if (parts[1] && parts[1].length === 3 && multiplier === 1) {
        s = s.replace(/\\./g, '');
      }
    }
    
    const cleaned = s.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num * multiplier;
  };

console.log(cleanNum("34.9 thousand"));
console.log(cleanNum("349 thousand"));
console.log(cleanNum("3.4K"));
