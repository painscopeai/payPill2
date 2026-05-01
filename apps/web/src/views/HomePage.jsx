import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Brain, Shield, Heart, Activity, Users, Pill, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import Header from '@/components/Header.jsx';
const HomePage = () => {
  const navigate = useNavigate();
  const {
    isAuthenticated
  } = useAuth();
  const features = [{
    icon: Brain,
    title: 'AI health insights',
    description: 'Get personalized recommendations based on your complete health profile and medical history'
  }, {
    icon: Shield,
    title: 'Secure health records',
    description: 'Your health data is encrypted and stored securely, compliant with HIPAA regulations'
  }, {
    icon: Pill,
    title: 'Medication management',
    description: 'Track your medications, check interactions, and find cost-effective generic alternatives'
  }, {
    icon: Users,
    title: 'Provider network',
    description: 'Find nearby healthcare providers based on your conditions, location, and insurance coverage'
  }, {
    icon: Heart,
    title: 'Risk assessment',
    description: 'Understand your health risks with AI-powered analysis of your vitals and lifestyle factors'
  }, {
    icon: Activity,
    title: 'Preventive care',
    description: 'Receive evidence-based recommendations for screenings and preventive measures'
  }];
  const stats = [{
    value: '98.7%',
    label: 'Patient satisfaction'
  }, {
    value: '2.4k+',
    label: 'Healthcare providers'
  }, {
    value: '47ms',
    label: 'Average response time'
  }];
  return <>
      <Helmet>
        <title>PayPill - AI-Powered Personalized Health Insights</title>
        <meta name="description" content="Transform your healthcare with PayPill's AI-powered health insights platform. Track medications, manage conditions, and get personalized recommendations." />
      </Helmet>
      <Header />
      
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6
          }} className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-powered health intelligence</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance" style={{
              letterSpacing: '-0.02em'
            }}>
                Your personalized health insights platform
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-prose">
                Transform your healthcare experience with AI-powered insights. Track medications, manage chronic conditions, 
                and receive evidence-based recommendations tailored to your complete health profile.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/signup')} className="group">
                  {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate(isAuthenticated ? '/ai-insights' : '/login')}>
                  {isAuthenticated ? 'AI Insights' : 'Sign In'}
                </Button>
              </div>
              
              <div className="flex items-center gap-8 pt-4">
                {stats.map((stat, index) => <div key={index}>
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>)}
              </div>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            scale: 0.95
          }} animate={{
            opacity: 1,
            scale: 1
          }} transition={{
            duration: 0.6,
            delay: 0.2
          }} className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-3xl"></div>
              <img src="https://horizons-cdn.hostinger.com/1b96e47f-b2e2-4331-a217-0c1a8259c625/screenshot-2026-04-21-102507-PkWHe.png" alt="Healthcare professional reviewing patient data on a digital tablet" className="relative rounded-2xl shadow-2xl w-full" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.6
        }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-balance mb-4">
              Comprehensive health management in one place
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to take control of your health, backed by AI and evidence-based medicine
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => <motion.div key={index} initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.5,
            delay: index * 0.1
          }}>
                <Card className="h-full shadow-lg hover:shadow-xl transition-all duration-300 border-border">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>)}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{
            opacity: 0,
            x: -20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.6
          }}>
              <h2 className="text-3xl md:text-4xl font-bold text-balance mb-6">
                Why healthcare providers trust PayPill
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Built with input from healthcare professionals and patients, PayPill combines cutting-edge AI 
                with clinical best practices to deliver actionable insights that improve health outcomes.
              </p>
              
              <div className="space-y-4">
                {['HIPAA compliant and encrypted data storage', 'Evidence-based clinical recommendations', 'Real-time medication interaction checking', 'Integration with major insurance providers'].map((item, index) => <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-base">{item}</span>
                  </div>)}
              </div>
            </motion.div>

            <motion.div initial={{
            opacity: 0,
            x: 20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.6
          }} className="space-y-6">
              <Card className="shadow-lg border-primary/20">
                <CardHeader>
                  <CardTitle>Real-time AI analysis</CardTitle>
                  <CardDescription>
                    Get instant insights on medication interactions, risk factors, and personalized recommendations
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-lg border-secondary/20">
                <CardHeader>
                  <CardTitle>Comprehensive tracking</CardTitle>
                  <CardDescription>
                    Monitor vitals, medications, conditions, and lifestyle factors all in one secure platform
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="shadow-lg border-accent/20">
                <CardHeader>
                  <CardTitle>Provider network</CardTitle>
                  <CardDescription>
                    Find and connect with healthcare providers based on your specific needs and location
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          duration: 0.6
        }} className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-balance">
              Start your journey to better health today
            </h2>
            <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
              Join thousands of patients who have taken control of their health with PayPill's AI-powered insights
            </p>
            <Button size="lg" variant="secondary" onClick={() => navigate('/signup')} className="mt-4 group">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 border-t bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">PayPill</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <span className="text-muted-foreground">© 2026 PayPill</span>
              <a href="#" className="hover:underline">Privacy Policy</a>
              <a href="#" className="hover:underline">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </>;
};
export default HomePage;