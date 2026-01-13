import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package } from "lucide-react";
import { useEffect } from "react";

export default function AuthPage() {
    const { user, loginMutation, registerMutation } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (user) {
            setLocation("/");
        }
    }, [user, setLocation]);

    const loginForm = useForm<InsertUser>({
        resolver: zodResolver(insertUserSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const registerForm = useForm<InsertUser>({
        resolver: zodResolver(insertUserSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const onLogin = (data: InsertUser) => {
        loginMutation.mutate(data);
    };

    const onRegister = (data: InsertUser) => {
        registerMutation.mutate(data);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
                {/* Hero Section */}
                <div className="hidden lg:flex flex-col gap-6 p-8">
                    <div className="flex items-center gap-3 text-primary">
                        <Package className="w-12 h-12" />
                        <span className="text-4xl font-bold tracking-tight">BranDeck ERP</span>
                    </div>
                    <h1 className="text-5xl font-extrabold leading-tight">
                        Manage your inventory and production with ease.
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        A comprehensive, high-performance ERP system designed for modern manufacturing and trading businesses.
                    </p>
                    <div className="flex gap-4 mt-8">
                        <div className="bg-background p-4 rounded-xl shadow-sm border">
                            <div className="text-2xl font-bold text-primary">Live Tracking</div>
                            <div className="text-sm text-muted-foreground">Real-time stock updates.</div>
                        </div>
                        <div className="bg-background p-4 rounded-xl shadow-sm border">
                            <div className="text-2xl font-bold text-primary">Production</div>
                            <div className="text-sm text-muted-foreground">Detailed BOM & EOD logic.</div>
                        </div>
                    </div>
                </div>

                {/* Auth Forms */}
                <Card className="shadow-xl border-none ring-1 ring-border/50">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
                        <CardDescription className="text-center">
                            Enter your credentials to access your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="login" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-8">
                                <TabsTrigger value="login">Login</TabsTrigger>
                                <TabsTrigger value="register">Register</TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <form
                                    onSubmit={loginForm.handleSubmit(onLogin)}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            autoComplete="username"
                                            {...loginForm.register("username")}
                                        />
                                        {loginForm.formState.errors.username && (
                                            <p className="text-sm text-destructive font-medium">
                                                {loginForm.formState.errors.username.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            autoComplete="current-password"
                                            {...loginForm.register("password")}
                                        />
                                        {loginForm.formState.errors.password && (
                                            <p className="text-sm text-destructive font-medium">
                                                {loginForm.formState.errors.password.message}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={loginMutation.isPending}
                                    >
                                        {loginMutation.isPending ? "Logging in..." : "Login"}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="register">
                                <form
                                    onSubmit={registerForm.handleSubmit(onRegister)}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-username">Username</Label>
                                        <Input id="reg-username" {...registerForm.register("username")} />
                                        {registerForm.formState.errors.username && (
                                            <p className="text-sm text-destructive font-medium">
                                                {registerForm.formState.errors.username.message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-password">Password</Label>
                                        <Input
                                            id="reg-password"
                                            type="password"
                                            {...registerForm.register("password")}
                                        />
                                        {registerForm.formState.errors.password && (
                                            <p className="text-sm text-destructive font-medium">
                                                {registerForm.formState.errors.password.message}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={registerMutation.isPending}
                                    >
                                        {registerMutation.isPending ? "Creating account..." : "Register"}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center">
                        <div className="text-xs text-muted-foreground">
                            By logging in, you agree to our Terms of Service.
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
