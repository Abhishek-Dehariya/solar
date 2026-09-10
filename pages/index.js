import Head from 'next/head';
import StringDashboard from '../components/StringDashboard';

export default function Home() {
  return (
    <>
      <Head>
        <title>Solar Dashboard · eSenZ</title>
        <meta name="description" content="Live solar string-comparison dashboard for the eSenZ monitoring platform." />
      </Head>
      <StringDashboard />
    </>
  );
}
