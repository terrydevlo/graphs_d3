let strip_extension = (inputStr) => {

  let periodLocation = inputStr.lastIndexOf(".");
  let outStr = inputStr.substring(0, periodLocation);
  let ext = inputStr.substring(periodLocation);

  return outStr;

}



let strip_extensions = (files) => {
  let filesNoExt = [];
  let extensions = [];
  files.forEach((f) => {
    let file = strip_extension(f);
    filesNoExt.push(file);
  });
  return filesNoExt;
}

let butter_filenames = (filenames, newPrefix, newSuffix="") => {
  let butteredFiles = []
  filenames.forEach((file) => {
    let newFile = newPrefix + file + newSuffix;
    butteredFiles.push(newFile);
  });
  return butteredFiles;
}





export { butter_filenames, strip_extension, strip_extensions };