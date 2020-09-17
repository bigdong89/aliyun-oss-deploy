/**
 * Created by hustcc on 18/5/10.
 * Contract: i@hust.cc
 */

const fs = require('fs');
const path = require('path');

const co = require('co');
const OSS = require('ali-oss');
const globby = require('globby');

const fileList = filePath =>
  fs.statSync(filePath).isFile() ? [ filePath ] : globby.sync([ '**/*.*' ], { cwd: filePath });

/**
 * 上传文件的 generator
 * @param filePath
 * @param config
 * @param prefix
 * @param byStream
 * @param removePath
 */
const deployGenerator = function* (filePath, config, prefix, byStream, removePath) {
  filePath = filePath && path.resolve(filePath);
  prefix = prefix || '';

  const client = new OSS(config);

  // 获得文件列表，并添加相对目录
  const files = fileList(filePath);
  // const func = byStream ? uploadByPutStream : uploadByPutObject;

  const r = [];

  // remove remote path
  if (removePath) {
    // const result = yield co(client.delete(removePath));
    // r.push(result);
    const list = yield co(client.list({ "prefix": removePath, "max-keys": 1000 }));
    list.objects = list.objects || [];
    for(const file of list.objects) {
      const result = yield co(client.delete(file));
      r.push(result);
    }
  }

  // upload files
  for (const file of files) {
    const ossTarget = path.join(prefix, file);
    // stream
    const stream = fs.createReadStream(path.join(filePath, file));

    // 使用 oss 上传文件 file 到 targetFile
    const result = yield byStream ?
      co(client.putStream(ossTarget, stream)) :
      co(client.put(ossTarget, stream));

    r.push(result);
  }
  return r;
};

/**
 * 入口方法
 * @param filePath 上传的文件目录
 * @param config aliyun oss 配置内容
 * @param prefix 上传到 oss 的批量文件前缀，可以用于做版本号
 * @param byStream 默认是 putObject
 * @param removePath 要移除的远端路径，用于处理清除无法覆盖掉的上次版本文件
 */
module.exports = async (filePath, config, prefix, byStream, removePath) => {
  return await co(deployGenerator(filePath, config, prefix, byStream, removePath));
};

module.exports.deployGenerator = deployGenerator;
