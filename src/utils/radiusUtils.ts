// Utility functions for radius selection with quarter-mile increments

/**
 * Rounds a number to the nearest quarter mile (0.25, 0.5, 0.75, 1.0, etc.)
 */
export const roundToQuarterMile = (value: number): number => {
  return Math.round(value * 4) / 4;
};

/**
 * Formats a radius value to display with exactly 2 decimal places
 */
export const formatRadiusDisplay = (value: number): string => {
  return value.toFixed(2);
};

/**
 * Validates and formats a radius input to quarter-mile increments
 */
export const validateAndFormatRadius = (input: string): number | null => {
  const numValue = parseFloat(input);
  
  if (isNaN(numValue) || numValue < 0.25 || numValue > 50) {
    return null;
  }
  
  return roundToQuarterMile(numValue);
};

/**
 * Generates quarter-mile step values from 0.25 to 50 miles
 */
export const getQuarterMileSteps = (): number[] => {
  const steps: number[] = [];
  for (let i = 0.25; i <= 50; i += 0.25) {
    steps.push(parseFloat(i.toFixed(2)));
  }
  return steps;
};

/**
 * Handles radius change from slider, ensuring quarter-mile increments
 */
export const handleRadiusSliderChange = (value: number): number => {
  return roundToQuarterMile(value);
};

/**
 * Handles radius input from text field, validating and formatting
 */
export const handleRadiusInputChange = (input: string): { value: number | null; display: string } => {
  const validatedValue = validateAndFormatRadius(input);
  
  if (validatedValue === null) {
    return { value: null, display: input };
  }
  
  return { 
    value: validatedValue, 
    display: formatRadiusDisplay(validatedValue) 
  };
}; 