export const handleImageProcess = (file: File, maxSize: number = 250): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/image.*/)) {
      return reject(new Error("File is not an image"));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = reject;
      if (e.target?.result) img.src = e.target.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
