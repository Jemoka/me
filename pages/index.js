import Head from 'next/head'

const greetings = ["hewo", "yoy", "yo", "heyo"];

export default function Home() {
    return (
        <div className="m-5">
            <Head>
                <title>@jemoka</title>
                <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            </Head>
            <h1 className="text-3xl">👋 <span className="font-bold">{greetings[Math.floor(Math.random() * greetings.length)]}!</span> How goes it?</h1>
            <div className="mt-2">Welcome to the personal site of <span className="font-bold whitespace-nowrap">Houjun "Jack" Liu</span>. <br /> On the blaggosphere as <a href="https://twitter.com/jemokajack">@jemoka</a> and, far more frequently, <a href="https://www.reddit.com/user/jemoka">u/jemoka</a> and <a href="https://github.com/jemoka/">GH @jemoka</a>.</div>
            <br />
            <hr />
            <br />
            <h1 className="text-xl font-bold">Who's this guy?</h1>
            I am a <a href="https://avatars.githubusercontent.com/u/28765741?v=4">human</a> interested in <a href="https://arxiv.org/abs/2104.10661">linguistic analysis</a>, <a href="https://www.preprints.org/manuscript/202004.0214/v1">social metrics</a>, and <a href="https://www.shabang.cf/">user interfaces</a>. <a href="https://en.wikipedia.org/wiki/Artificial_general_intelligence">AGI</a> & <a href="https://www.vim.org/">Vim</a> are cool. I run <a href="https://www.condution.com/">Condution</a> and <a href="https://www.shabang.cf/">Shabang</a>, do <a href="https://arxiv.org/abs/2104.10661">research on NLP</a>, and recently took over ops at <a href="http://modap.io/">MODAP</a>. Oh right, I also go to school at <a href="https://www.nuevaschool.org/">The Nueva School.</a> 
            <br />
            Need to catch me? <a href="mailto:hliu@shabang.cf">hliu@shabang.cf</a>. Please do email me, I actually check.
            <br />
            Here are a few things that <a href="https://interesting.jemoka.com/">I find interesting</a>, in case you are wondering.
            <br />
            <br />
            <h1 className="text-xl font-bold">Recent Projects</h1>
            Take a look at <a href="https://github.com/jemoka/">my GitHub profile note</a>, which will be more up to date than this website anyways...
            <br />
            <br />
            <h1 className="text-xl font-bold">Blag</h1>
            I recently started a <a href="https://blog.jemoka.com/">Blag</a>. Check it out!
            <br />
            <br />
            <h1 className="text-xl font-bold">Bugga Bugga Bontehu?</h1>
            Sometimes I use this domain as a downlink to <span className="code">fastcalculator</span> to friends and coworkers. To achieve this, here are two links you could click on that I don't always promise do anything: <a href="https://oliver.jemoka.com/">oliver</a> and <a href="https://socks.jemoka.com/">socks</a>.
        </div>
    )
}
