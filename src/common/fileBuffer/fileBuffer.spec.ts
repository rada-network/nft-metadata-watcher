import { FileBuffer } from './fileBuffer';

describe('fileBuffer', () => {
  it('success: fromBase64', () => {
    const oneDotGifBase64 =
      'R0lGODlhAQABAGAAACH5BAEKAP8ALAAAAAABAAEAAAgEAP8FBAA7';
    return FileBuffer.fromBase64(oneDotGifBase64).then((r) => {
      expect(r.ext).toEqual('gif');
      expect(r.mime).toEqual('image/gif');
    });
  });

  it('fail: fromBase64', () => {
    return FileBuffer.fromBase64('AAAAAAAAAAAAAAAAAAAAAAA')
      .then(() => {
        throw new Error('fail');
      })
      .catch((e) => {
        expect(e).toBeInstanceOf(Error);
      });
  });

  it('isImage', () => {
    const okGif = new FileBuffer(Buffer.from('test'), null, 'image/gif');
    expect(okGif.isImage()).toBeTruthy();
    const okPng = new FileBuffer(Buffer.from('test'), null, 'image/png');
    expect(okPng.isImage()).toBeTruthy();
    const okJpg = new FileBuffer(Buffer.from('test'), null, 'image/jpeg');
    expect(okJpg.isImage()).toBeTruthy();
    const ng = new FileBuffer(Buffer.from('test'), null, 'audio/wav');
    expect(ng.isImage()).toBeFalsy();
  });
});
