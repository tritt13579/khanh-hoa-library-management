export function numberToVietnameseWords(number: number): string {
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const largeUnits = ["", "nghìn", "triệu", "tỷ"];

  const readTriple = (n: number, isFirstGroup: boolean): string => {
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;
    let result = "";

    if (hundred > 0) {
      result += digits[hundred] + " trăm";
      if (ten === 0 && unit > 0) result += " linh";
    } else if (!isFirstGroup && (ten > 0 || unit > 0)) {
      result += "không trăm";
      if (ten === 0 && unit > 0) result += " linh";
    }

    if (ten > 1) {
      result += " " + digits[ten] + " mươi";
      if (unit === 1) result += " mốt";
      else if (unit === 5) result += " lăm";
      else if (unit > 0) result += " " + digits[unit];
    } else if (ten === 1) {
      result += " mười";
      if (unit === 5) result += " lăm";
      else if (unit > 0) result += " " + digits[unit];
    } else if (ten === 0 && unit > 0 && hundred !== 0) {
      result += " " + digits[unit];
    } else if (ten === 0 && unit > 0 && hundred === 0 && !isFirstGroup) {
      result += " " + digits[unit];
    }

    return result.trim();
  };

  if (number === 0) return "Không đồng";

  const parts: string[] = [];
  let unitIndex = 0;
  const groups: number[] = [];

  while (number > 0) {
    groups.unshift(number % 1000);
    number = Math.floor(number / 1000);
  }

  const maxUnitIndex = groups.length - 1;

  for (let i = 0; i <= maxUnitIndex; i++) {
    const group = groups[i];
    if (group !== 0) {
      const part = readTriple(group, i === 0);
      const unit = largeUnits[maxUnitIndex - i];
      parts.push(part + (unit ? " " + unit : ""));
    } else if (i === maxUnitIndex && parts.length === 0) {
      // number was 0
      parts.push("không");
    }
  }

  return parts.join(", ") + " đồng";
}
