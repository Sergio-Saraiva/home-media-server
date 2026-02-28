using MediaServer.Api.Infrastructure;
using MediaServer.Application.Models;
using MediaServer.IOC;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<AppSettings>(
    builder.Configuration
);

builder.Services.AddControllers();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = []
    });
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.RegisterServices(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebClient", policy =>
    {
        policy.WithOrigins("http://localhost:5173") // Your Vite dev server URL
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
    
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "FtvScores Auth API");
    });
    app.MapGet("/", async context =>
    {
        context.Response.Redirect("/swagger");
        await Task.CompletedTask;
    });
}

app.UseCors("AllowWebClient");

var provider = new FileExtensionContentTypeProvider();

// The critical mapping for WebAssembly
provider.Mappings[".wasm"] = "application/wasm";
// The data file Emscripten uses for the virtual file system
provider.Mappings[".data"] = "application/octet-stream";
// The fontconfig XML file
provider.Mappings[".conf"] = "application/xml"; 

// .js and .woff2 are usually supported by default in .NET, 
// but it is safer to ensure .woff2 is mapped
if (!provider.Mappings.ContainsKey(".woff2")) 
{
    provider.Mappings[".woff2"] = "font/woff2";
}

var wasmPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "wasm");

// 4. Enable Static File serving


app.UseExceptionHandler(_ => { });

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(wasmPath),
    RequestPath = "/wasm",
    ContentTypeProvider = provider,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "public,max-age=86400";
        ctx.Context.Response.Headers["Access-Control-Allow-Origin"] = "*";
    }
});

app.Run();
