import Drakvalvet from '../components/drakvalvet';

export default function Page() {
  const environment =
    process.env.VERCEL_ENV === 'preview'
      ? 'PREVIEW'
      : process.env.VERCEL_ENV === 'production'
        ? 'PRODUCTION'
        : 'LOCAL';
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? 'local';
  const patch = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'development').slice(0, 7);

  return <Drakvalvet buildInfo={{ environment, branch, patch }} />;
}
